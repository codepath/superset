# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
# OR CONDITIONS OF ANY KIND, either express or implied.  See the
# License for the specific language governing permissions and
# limitations under the License.
"""
Unit tests for custom database error messages functionality.
"""
import re
from unittest.mock import MagicMock

import pytest
from pytest_mock import MockerFixture

from superset.db_engine_specs.base import BaseEngineSpec
from superset.errors import ErrorLevel, SupersetError, SupersetErrorType


def test_extract_errors_with_custom_config_pattern_match(mocker: MockerFixture) -> None:
    """
    Test that custom error messages are extracted when pattern matches.
    """
    custom_errors = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {
                    "show_issue_info": False,
                },
            ),
        }
    }

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test error message that matches the pattern
    error_msg = "relation 'non_existing_table' does not exist"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].message == "The table you're trying to access doesn't exist"
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result[0].level == ErrorLevel.ERROR
    assert result[0].extra == {
        "show_issue_info": False,
        "engine_name": None,  # BaseEngineSpec has engine_name = None by default
    }


def test_extract_errors_with_regex_capture_groups(mocker: MockerFixture) -> None:
    """
    Test that regex capture groups work for dynamic message interpolation.
    """
    custom_errors = {
        "test_db": {
            re.compile(
                r"relation \"(?P<table_name>.+)\" does not exist", re.IGNORECASE
            ): (
                "The table '%(table_name)s' does not exist. Please check the table name and try again.",
                SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR,
                {
                    "show_issue_info": False,
                },
            ),
        }
    }

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test error message that matches the pattern and captures table name
    error_msg = 'relation "users" does not exist'
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert (
        result[0].message
        == "The table 'users' does not exist. Please check the table name and try again."
    )
    assert result[0].error_type == SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR
    assert result[0].level == ErrorLevel.ERROR
    assert result[0].extra == {
        "show_issue_info": False,
        "engine_name": None,
    }


def test_extract_errors_with_show_issue_info_flag(mocker: MockerFixture) -> None:
    """
    Test that show_issue_info flag controls whether issue codes are added to error extra.
    """
    # Test case 1: show_issue_info: False - issue codes should NOT be added
    custom_errors_false = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {
                    "show_issue_info": False,
                },
            ),
        }
    }

    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors_false
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    error_msg = "relation 'non_existing_table' does not exist"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    # When show_issue_info is False, issue_codes should NOT be in extra
    assert "issue_codes" not in result[0].extra
    assert result[0].extra["show_issue_info"] is False
    assert result[0].extra["engine_name"] is None

    # Test case 2: show_issue_info: True - issue codes SHOULD be added
    custom_errors_true = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {
                    "show_issue_info": True,
                },
            ),
        }
    }

    mock_config.get.return_value = custom_errors_true
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    # When show_issue_info is True, issue_codes SHOULD be in extra
    assert "issue_codes" in result[0].extra
    assert result[0].extra["show_issue_info"] is True
    # GENERIC_DB_ENGINE_ERROR maps to issue code 1002
    assert len(result[0].extra["issue_codes"]) == 1
    assert result[0].extra["issue_codes"][0]["code"] == 1002

    # Test case 3: show_issue_info missing (default) - issue codes SHOULD be added
    custom_errors_default = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {},  # No show_issue_info flag - should default to True
            ),
        }
    }

    mock_config.get.return_value = custom_errors_default
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    # When show_issue_info is missing, it defaults to True, so issue_codes SHOULD be in extra
    assert "issue_codes" in result[0].extra
    # show_issue_info won't be in extra when not explicitly set (defaults to True behavior)
    assert result[0].extra.get("show_issue_info") is not False
    assert len(result[0].extra["issue_codes"]) == 1
    assert result[0].extra["issue_codes"][0]["code"] == 1002


def test_extract_errors_with_custom_doc_links(mocker: MockerFixture) -> None:
    """
    Test that custom_doc_links are included in error extra when provided.
    """
    custom_errors = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {
                    "show_issue_info": False,
                    "custom_doc_links": [
                        {
                            "url": "https://docs.example.com/troubleshooting",
                            "label": "Troubleshooting Guide",
                        },
                        {
                            "url": "https://docs.example.com/tables",
                            "label": "View available tables",
                        },
                    ],
                },
            ),
        }
    }

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test error message that matches the pattern
    error_msg = "relation 'non_existing_table' does not exist"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].message == "The table you're trying to access doesn't exist"
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result[0].level == ErrorLevel.ERROR
    
    # Verify custom_doc_links are present in extra
    assert "custom_doc_links" in result[0].extra
    assert isinstance(result[0].extra["custom_doc_links"], list)
    assert len(result[0].extra["custom_doc_links"]) == 2
    
    # Verify structure of custom_doc_links
    link1 = result[0].extra["custom_doc_links"][0]
    assert link1["url"] == "https://docs.example.com/troubleshooting"
    assert link1["label"] == "Troubleshooting Guide"
    
    link2 = result[0].extra["custom_doc_links"][1]
    assert link2["url"] == "https://docs.example.com/tables"
    assert link2["label"] == "View available tables"
    
    # Verify other extra fields are still present
    assert result[0].extra["show_issue_info"] is False
    assert result[0].extra["engine_name"] is None


def test_extract_errors_pattern_no_match_fallback(mocker: MockerFixture) -> None:
    """
    Test that when custom error pattern doesn't match, system falls back to generic error.
    """
    custom_errors = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {},
            ),
        }
    }

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test error message that does NOT match the pattern
    error_msg = "syntax error at or near 'SELECT'"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    # Should fall back to generic error since pattern doesn't match
    assert len(result) == 1
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result[0].message == error_msg  # Should use raw error message
    assert result[0].level == ErrorLevel.ERROR
    # Issue codes are automatically added for GENERIC_DB_ENGINE_ERROR
    assert "engine_name" in result[0].extra
    assert result[0].extra["engine_name"] is None
    assert "issue_codes" in result[0].extra


def test_extract_errors_multiple_databases(mocker: MockerFixture) -> None:
    """
    Test that custom errors work correctly when multiple databases are configured.
    """
    custom_errors = {
        "test_db": {
            re.compile(r"relation.*does not exist", re.IGNORECASE): (
                "The table you're trying to access doesn't exist",
                SupersetErrorType.GENERIC_DB_ENGINE_ERROR,
                {"show_issue_info": False},
            ),
        },
        "other_db": {
            re.compile(r"connection.*refused", re.IGNORECASE): (
                "Connection to database was refused",
                SupersetErrorType.CONNECTION_PORT_CLOSED_ERROR,
                {},
            ),
        },
    }

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test with test_db - should use test_db's custom error
    error_msg = "relation 'non_existing_table' does not exist"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    assert len(result) == 1
    assert result[0].message == "The table you're trying to access doesn't exist"
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result[0].extra["show_issue_info"] is False

    # Test with other_db - should use other_db's custom error
    error_msg2 = "connection to localhost:5432 refused"
    result2 = BaseEngineSpec.extract_errors(
        Exception(error_msg2),
        context={"database_name": "other_db"},
    )

    assert len(result2) == 1
    assert result2[0].message == "Connection to database was refused"
    assert result2[0].error_type == SupersetErrorType.CONNECTION_PORT_CLOSED_ERROR

    # Test with a database that has no custom errors - should fall back to generic
    error_msg3 = "some random error"
    result3 = BaseEngineSpec.extract_errors(
        Exception(error_msg3),
        context={"database_name": "unknown_db"},
    )

    assert len(result3) == 1
    assert result3[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result3[0].message == error_msg3


def test_extract_errors_empty_config(mocker: MockerFixture) -> None:
    """
    Test that empty config doesn't break anything and falls back to generic error.
    """
    # Empty config
    custom_errors = {}

    # Mock current_app.config with a MagicMock that supports .get() method
    mock_config = MagicMock()
    mock_config.get.return_value = custom_errors
    mocker.patch(
        "superset.db_engine_specs.base.current_app.config",
        mock_config,
    )

    # Test error message - should fall back to generic error
    error_msg = "relation 'non_existing_table' does not exist"
    result = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    # Should fall back to generic error since config is empty
    assert len(result) == 1
    assert result[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result[0].message == error_msg  # Should use raw error message
    assert result[0].level == ErrorLevel.ERROR
    # Issue codes are automatically added for GENERIC_DB_ENGINE_ERROR
    assert "engine_name" in result[0].extra
    assert result[0].extra["engine_name"] is None
    assert "issue_codes" in result[0].extra

    # Test with config.get returning empty dict (simulating default behavior)
    # The code uses .get("CUSTOM_DATABASE_ERRORS", {}) which returns {} if not set
    mock_config.get.return_value = {}
    result2 = BaseEngineSpec.extract_errors(
        Exception(error_msg),
        context={"database_name": "test_db"},
    )

    # Should still work and fall back to generic error
    assert len(result2) == 1
    assert result2[0].error_type == SupersetErrorType.GENERIC_DB_ENGINE_ERROR
    assert result2[0].message == error_msg
    assert "issue_codes" in result2[0].extra

