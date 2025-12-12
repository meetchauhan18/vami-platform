import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().max(254).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/)
    .pattern(/[a-z]/)
    .pattern(/[0-9]/)
    .pattern(/[^A-Za-z0-9]/)
    .required(),
  firstName: Joi.string().max(50).allow('', null),
  lastName: Joi.string().max(50).allow('', null),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

export default {
  registerSchema,
  loginSchema,
};
