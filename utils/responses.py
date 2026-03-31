"""
Standardized API response utilities
"""
from flask import jsonify

def success_response(data=None, message="Success", status_code=200):
    """
    Create a standardized success response
    
    Args:
        data: Response data
        message (str): Success message
        status_code (int): HTTP status code
        
    Returns:
        Flask response object
    """
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    return jsonify(response), status_code

def error_response(message="An error occurred", status_code=400, error_code=None):
    """
    Create a standardized error response
    
    Args:
        message (str): Error message
        status_code (int): HTTP status code
        error_code (str): Optional error code for client handling
        
    Returns:
        Flask response object
    """
    response = {
        "success": False,
        "message": message,
        "error_code": error_code
    }
    return jsonify(response), status_code

def validation_error_response(errors):
    """
    Create a validation error response
    
    Args:
        errors (dict): Dictionary of field validation errors
        
    Returns:
        Flask response object
    """
    response = {
        "success": False,
        "message": "Validation failed",
        "errors": errors
    }
    return jsonify(response), 422