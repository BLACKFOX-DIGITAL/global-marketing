import { prisma } from './prisma'

export async function logActivity({
    userId,
    type,
    action,
    description,
    referenceId,
    leadId,
    opportunityId
}: {
    userId: string
    type: 'LEAD' | 'OPPORTUNITY' | 'TASK' | 'USER' | 'SYSTEM'
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'CONVERTED' | 'STATUS_CHANGE' | 'CALL_ATTEMPT' | 'MAIL_ATTEMPT' | 'TASK_CREATED' | 'RECLAIMED' | 'RECIRCULATED' | 'CLAIMED_FROM_POOL' | 'DELETION_REQUESTED' | 'RESTORED' | 'SENT_TO_POOL'
    description: string
    referenceId?: string
    leadId?: string
    opportunityId?: string
}) {
    try {
        return await prisma.activityLog.create({
            data: {
                userId,
                type,
                action,
                description,
                referenceId,
                leadId,
                opportunityId
            }
        })
    } catch (err) {
        console.error('Failed to log activity:', err)
    }
}

export async function createNotification({
    userId,
    title,
    message,
    type = 'INFO',
    link
}: {
    userId: string
    title: string
    message: string
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT'
    link?: string
}) {
    try {
        return await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        })
    } catch (err) {
        console.error('Failed to create notification:', err)
    }
}
