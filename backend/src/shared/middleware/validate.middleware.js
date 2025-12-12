import responseUtils from '../utils/response.js';

const { errorResponse } = responseUtils;

/**
 * Validates request body against Joi schema
 */
const validateBody = schema => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(d => ({
      field: d.context.key,
      message: d.message,
    }));

    return errorResponse(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      details
    );
  }

  req.body = value;
  return next();
};

export default { validateBody };
