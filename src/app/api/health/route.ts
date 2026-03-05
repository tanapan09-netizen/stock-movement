import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    services: {
        database: {
            status: 'up' | 'down';
            latency?: number;
            error?: string;
        };
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
    };
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
    // Determine if requester is authorized for detailed metrics
    const authHeader = request.headers.get('authorization');
    const hasCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Check session
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAdmin = session?.user && (session.user as any).role === 'admin';

    const isAuthorized = hasCronSecret || isAdmin;

    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: { status: 'down' },
            memory: { used: 0, total: 0, percentage: 0 }
        }
    };

    // Check database connection
    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        health.services.database = {
            status: 'up',
            latency: dbLatency
        };
    } catch (error) {
        health.status = 'unhealthy';
        health.services.database = {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }

    // Check memory usage
    try {
        const memUsage = process.memoryUsage();
        const totalMem = memUsage.heapTotal;
        const usedMem = memUsage.heapUsed;
        const memPercentage = Math.round((usedMem / totalMem) * 100);

        health.services.memory = {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: memPercentage
        };

        // Warn if memory usage is high
        if (memPercentage > 90) {
            health.status = health.status === 'healthy' ? 'degraded' : health.status;
        }
    } catch {
        // Ignore memory check errors
    }

    // Determine HTTP status code
    const httpStatus = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

    // Mask detailed info if unauthorized
    if (!isAuthorized) {
        return NextResponse.json({
            status: health.status,
            timestamp: health.timestamp
        }, { status: httpStatus });
    }

    return NextResponse.json(health, { status: httpStatus });
}
