package com.interviewplatform.interview.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ValidationErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<FieldValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new FieldValidationError(
                        fieldError.getField(),
                        fieldError.getDefaultMessage()))
                .toList();
        return new ValidationErrorResponse("Validation failed", errors);
    }
}