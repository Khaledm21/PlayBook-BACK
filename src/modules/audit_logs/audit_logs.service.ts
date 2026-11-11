import { prisma } from '../../db/prisma';
import { GetAuditLogsQuery } from './audit_logs.schema';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  static async log(params: CreateAuditLogParams) {
    try {
      const detailsString =
        typeof params.details === 'object' && params.details !== null
          ? JSON.stringify(params.details)
          : (params.details as string | undefined);

      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          details: detailsString || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Non-blocking error for main execution
      return null;
    }
  }

  static async getLogs(query: GetAuditLogsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? safeJsonParse(log.details) : null,
    }));

    return {
      logs: formattedLogs,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

