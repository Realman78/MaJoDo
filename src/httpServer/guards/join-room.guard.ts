import Joi from 'joi';
import { Request, Response, NextFunction } from "express";

const roomNameSchema = Joi.object({
    roomName: Joi.string().required().messages({
        'string.base': 'Room name must be a string.',
        'string.empty': 'Room name is required.',
        'any.required': 'Room name is required.'
    })
});

const JoinRoomValidator = (req: Request, res: Response, next: NextFunction) => {
    const { error } = roomNameSchema.validate(req.body);
    
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    next();
};

export default JoinRoomValidator