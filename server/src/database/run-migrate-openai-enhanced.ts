import { runOpenAIEnhancedMigration } from './migrate-openai-enhanced'

;(async () => {
  try {
    await runOpenAIEnhancedMigration()
    console.log('Migration runner completed successfully')
    process.exit(0)
  } catch (err) {
    console.error('Migration runner failed:', err)
    process.exit(1)
  }
})()
