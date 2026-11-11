import { Request, Response, NextFunction } from 'express';
import { PitchService } from './pitches.service';
import { sendSuccess } from '../../utils/response';
import { CreatePitchInput, UpdatePitchInput } from './pitches.schema';

export class PitchController {
  static async createPitch(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const body = req.body as CreatePitchInput;
      const pitch = await PitchService.createPitch(ownerId, isAdmin, body);

      return sendSuccess(res, pitch, 201, 'تم إضافة الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getPitchById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const pitch = await PitchService.getPitchById(id);

      return sendSuccess(res, pitch, 200, 'تم استرجاع بيانات الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getPitchesByVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { venueId } = req.params;
      const pitches = await PitchService.getPitchesByVenue(venueId);

      return sendSuccess(res, pitches, 200, 'تم استرجاع قائمة ملاعب المجمع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updatePitch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const body = req.body as UpdatePitchInput;
      const updated = await PitchService.updatePitch(id, ownerId, isAdmin, body);

      return sendSuccess(res, updated, 200, 'تم تحديث بيانات الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async deletePitch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      await PitchService.deletePitch(id, ownerId, isAdmin);

      return sendSuccess(res, { success: true }, 200, 'تم حذف الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

