import Joi from 'joi';

const updateProfileSchema = Joi.object({
  profile: Joi.object({
    firstName: Joi.string().max(50).allow('', null),
    lastName: Joi.string().max(50).allow('', null),
    bio: Joi.string().max(200).allow('', null),
    avatarUrl: Joi.string().uri().max(500).allow('', null),
  })
    .min(1)
    .required(),
});

export default {
  updateProfileSchema,
};
