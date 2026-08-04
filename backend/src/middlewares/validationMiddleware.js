const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map((item) => item.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación en la solicitud',
        errors: details
      });
    }
    next();
  };
};

module.exports = { validateBody };
