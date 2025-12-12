const successResponse = (res, data, statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

const errorResponse = (
  res,
  message,
  statusCode = 500,
  code = 'SERVER_ERROR',
  details = []
) => {
  const response = {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

export default { successResponse, errorResponse };
