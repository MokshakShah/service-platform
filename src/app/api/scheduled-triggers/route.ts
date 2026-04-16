import { db } from '@/lib/db'
import { sendMail } from '@/lib/mailer'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { NextResponse } from 'next/server'

type TriggerTemplate = {
  triggerType?: string
  scheduleDate?: string
  scheduleTime?: string
  description?: string
  executedAt?: string | null
}

type WorkflowForSchedule = {
  id: string
  name: string
  userId: string
  flowPath: string | null
  triggerTemplate: string | null
  discordTemplate: string | null
  slackTemplate: string | null
  slackAccessToken: string | null
  slackChannels: string[]
  notionTemplate: string | null
  notionAccessToken: string | null
  notionDbId: string | null
}

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const getScheduledAt = (trigger: TriggerTemplate) => {
  if (!trigger.scheduleDate || !trigger.scheduleTime) return null

  const scheduledAt = new Date(`${trigger.scheduleDate}T${trigger.scheduleTime}`)

  if (Number.isNaN(scheduledAt.getTime())) {
    return null
  }

  return scheduledAt
}

const normalizeNotionContent = (content: string | null) => {
  if (!content) return 'Scheduled workflow trigger'

  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'string') {
      return parsed
    }
  } catch {
    return content
  }

  return content
}

const executeWorkflow = async (workflow: WorkflowForSchedule) => {
  const flowPath = parseJson<string[]>(workflow.flowPath, [])
  let executedSteps = 0

  for (const step of flowPath) {
    if (step === 'Discord' && workflow.discordTemplate) {
      const discordWebhook = await db.discordWebhook.findFirst({
        where: { userId: workflow.userId },
        select: { url: true },
      })

      if (discordWebhook?.url) {
        await postContentToWebHook(workflow.discordTemplate, discordWebhook.url)
        executedSteps++
      }
    }

    if (
      step === 'Slack' &&
      workflow.slackTemplate &&
      workflow.slackAccessToken &&
      workflow.slackChannels.length
    ) {
      await postMessageToSlack(
        workflow.slackAccessToken,
        workflow.slackChannels.map((channel) => ({ label: '', value: channel })),
        workflow.slackTemplate
      )
      executedSteps++
    }

    if (
      step === 'Notion' &&
      workflow.notionAccessToken &&
      workflow.notionDbId
    ) {
      await onCreateNewPageInDatabase(
        workflow.notionDbId,
        workflow.notionAccessToken,
        normalizeNotionContent(workflow.notionTemplate)
      )
      executedSteps++
    }

    if (step === 'Email') {
      const triggerTemplate = parseJson<any>(workflow.triggerTemplate, {})
      const emailConfig = triggerTemplate?.emailConfig

      if (emailConfig?.recipientEmail && emailConfig?.subject && emailConfig?.body) {
        await sendMail({
          to: emailConfig.recipientEmail,
          subject: emailConfig.subject,
          text: emailConfig.body,
          html: emailConfig.body.replace(/\n/g, '<br>'),
        })
        executedSteps++
      }
    }
  }

  return executedSteps
}

const runScheduledTriggers = async () => {
  const now = new Date()

  const workflows = await db.workflows.findMany({
    where: {
      publish: true,
      triggerTemplate: {
        not: null,
      },
      flowPath: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      flowPath: true,
      triggerTemplate: true,
      discordTemplate: true,
      slackTemplate: true,
      slackAccessToken: true,
      slackChannels: true,
      notionTemplate: true,
      notionAccessToken: true,
      notionDbId: true,
    },
  })

  let checked = 0
  let triggered = 0
  let skipped = 0
  let failed = 0

  for (const workflow of workflows) {
    checked++

    try {
      const triggerTemplate = parseJson<TriggerTemplate>(
        workflow.triggerTemplate,
        {}
      )

      if (triggerTemplate.triggerType !== 'schedule') {
        skipped++
        continue
      }

      if (triggerTemplate.executedAt) {
        skipped++
        continue
      }

      const scheduledAt = getScheduledAt(triggerTemplate)

      if (!scheduledAt || scheduledAt > now) {
        skipped++
        continue
      }

      const user = await db.user.findUnique({
        where: {
          clerkId: workflow.userId,
        },
        select: {
          credits: true,
        },
      })

      if (!user) {
        skipped++
        continue
      }

      if (user.credits !== 'Unlimited' && parseInt(user.credits || '0', 10) <= 0) {
        skipped++
        continue
      }

      await executeWorkflow(workflow)

      await db.workflows.update({
        where: {
          id: workflow.id,
        },
        data: {
          triggerTemplate: JSON.stringify({
            ...triggerTemplate,
            executedAt: now.toISOString(),
          }),
        },
      })

      if (user.credits !== 'Unlimited') {
        await db.user.update({
          where: {
            clerkId: workflow.userId,
          },
          data: {
            credits: `${Math.max(parseInt(user.credits || '0', 10) - 1, 0)}`,
          },
        })
      }

      triggered++
    } catch (error) {
      failed++
      console.error(`Scheduled workflow failed: ${workflow.name}`, error)
    }
  }

  return { checked, triggered, skipped, failed }
}

export async function GET() {
  const result = await runScheduledTriggers()

  return NextResponse.json({
    message: 'Scheduled trigger check completed',
    ...result,
  })
}

export async function POST() {
  const result = await runScheduledTriggers()

  return NextResponse.json({
    message: 'Scheduled trigger check completed',
    ...result,
  })
}
