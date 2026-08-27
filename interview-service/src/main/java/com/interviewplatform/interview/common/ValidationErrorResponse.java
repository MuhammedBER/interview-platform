package com.interviewplatform.interview.common;

import java.util.List;

public record ValidationErrorResponse(String message, List<FieldValidationError> errors) {
}