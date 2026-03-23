import { type ModelMessage, type UIMessageStreamWriter } from 'ai'
import { createRelatedQuestionsStream } from '@/lib/morphic/agents/generate-related-questions'
import { generateId } from '@/lib/morphic/db/schema'
import { relatedSchema } from '@/lib/morphic/schema/related'

/**
 * Generates and streams related questions
 */
export async function streamRelatedQuestions(
    writer: UIMessageStreamWriter,
    messages: ModelMessage[],
    abortSignal?: AbortSignal,
    parentTraceId?: string
): Promise<{
    questionPartId?: string
    questions?: Array<{ question: string }>
}> {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') {
        return {}
    }

    const questionPartId = generateId()

    try {
        // Write loading state
        writer.write({
            type: 'data-relatedQuestions',
            id: questionPartId,
            data: { status: 'loading' }
        })

        const relatedQuestionsResult = await createRelatedQuestionsStream(
            messages,
            abortSignal,
            parentTraceId
        )

        const collectedQuestions: Array<{ question: string }> = []

        for await (const question of relatedQuestionsResult.elementStream) {
            if (!question || typeof question.question !== 'string') {
                continue
            }

            collectedQuestions.push(question)

            writer.write({
                type: 'data-relatedQuestions',
                id: questionPartId,
                data: {
                    status: 'streaming',
                    questions: [...collectedQuestions]
                }
            })
        }

        let finalQuestions = collectedQuestions

        try {
            const completedQuestions = await relatedQuestionsResult.object
            const parsedQuestions = relatedSchema.safeParse(completedQuestions)

            if (parsedQuestions.success) {
                finalQuestions = parsedQuestions.data as Array<{ question: string }>
            } else if (Array.isArray(completedQuestions)) {
                finalQuestions = completedQuestions as Array<{ question: string }>
                console.warn(
                    'Related questions validation failed:',
                    parsedQuestions.error
                )
            }
        } catch (error) {
            console.warn('Error retrieving final related questions object:', error)
        }

        writer.write({
            type: 'data-relatedQuestions',
            id: questionPartId,
            data: {
                status: 'success',
                questions: finalQuestions
            }
        })

        return {
            questionPartId,
            questions: finalQuestions
        }
    } catch (error) {
        console.error('Error generating related questions:', error)

        // Write error state
        writer.write({
            type: 'data-relatedQuestions',
            id: questionPartId,
            data: { status: 'error' }
        })

        return { questionPartId }
    }
}
