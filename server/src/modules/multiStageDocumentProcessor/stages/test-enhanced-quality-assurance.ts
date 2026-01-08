/**
 * Test script for Enhanced Quality Assurance Stage
 * This script demonstrates the enhanced validation and compliance checking capabilities
 */

import { QualityAssuranceStage } from './qualityAssuranceStage'
import type { StageInput } from '../types'

async function testEnhancedQualityAssurance() {
  console.log('🔍 Testing Enhanced Quality Assurance Stage...')

  const qualityAssuranceStage = new QualityAssuranceStage()

  // Mock input data for testing
  const mockInput: StageInput = {
    stage_id: 'quality_assurance_test',
    stage_type: 'quality_assurance',
    input_data: {
      contextualized_document: {
        document_id: 'test_doc_001',
        title: 'Test Document for Quality Assurance',
        content: 'This is a test document with some content.',
        personalized_sections: {
          introduction: {
            personalized_content: 'This is the introduction section with proper content.',
            injected_context: {
              sources: [
                { type: 'project_data', content: 'Project context information' }
              ]
            },
            personalization_applied: true,
            context_relevance_score: 0.8
          },
          methodology: {
            personalized_content: 'This section describes the methodology used in the project.',
            injected_context: {
              sources: [
                { type: 'user_preferences', content: 'User preference data' }
              ]
            },
            personalization_applied: true,
            context_relevance_score: 0.9
          }
        }
      }
    },
    context: {
      project_context: {
        project_data: {
          template_context: {
            framework: 'BABOK'
          },
          compliance_requirements: ['GDPR', 'SOX'],
          security_level: 'high',
          accessibility_level: 'AA',
          data_classification: 'confidential',
          target_audience: ['business_analysts', 'project_managers']
        },
        stakeholders: [
          {
            stakeholder_id: 'stakeholder_001',
            name: 'Business Analyst',
            role: 'Primary Analyst',
            email: 'stakeholder@example.com',
            influence: 'medium',
            interest: 'high',
            requirements: []
          }
        ],
        requirements: [],
        constraints: [],
        risks: []
      },
      user_context: {
        user_profile: {
          user_id: 'user_001',
          name: 'QA Tester',
          email: 'tester@example.com',
          role: 'analyst',
          department: 'QA',
          expertise_areas: ['quality_assurance'],
          experience_level: 'mid'
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          date_format: 'YYYY-MM-DD',
          number_format: '#,###.##',
          currency: 'USD',
          units: 'metric'
        },
        expertise: {
          domain_expertise: ['quality_assurance'],
          technical_skills: [],
          certifications: [],
          experience_years: 5,
          proficiency_level: {}
        },
        writing_style: {
          tone: 'professional',
          voice: 'third_person',
          complexity: 'moderate',
          length_preference: 'detailed'
        }
      },
      historical_context: {
        similar_documents: [],
        best_practices: [],
        patterns: [],
        trends: []
      },
      external_context: {
        external_data: {},
        api_responses: {},
        integrations: []
      },
      stakeholder_context: {
        stakeholders: [
          {
            stakeholder_id: 'stakeholder_001',
            name: 'Business Analyst',
            role: 'Primary Analyst',
            interest_level: 'high',
            influence_level: 'medium'
          }
        ],
        total_stakeholders: 1
      }
    },
    config: {
      stage_id: 'quality_assurance_test',
      stage_type: 'quality_assurance',
      enabled: true,
      timeout: 30000,
      retry_attempts: 0,
      quality_threshold: 0.8,
      config: {
        accessibility_level: 'AA',
        data_classification: 'confidential'
      }
    },
    metadata: {
      request_id: 'test_request_001',
      timestamp: new Date(),
      stage_order: 5
    }
  }

  try {
    console.log('📋 Executing enhanced quality assurance stage...')
    const result = await qualityAssuranceStage.execute(mockInput)

    console.log('✅ Enhanced Quality Assurance Stage completed successfully!')
    console.log('\n📊 Quality Assessment Results:')
    console.log(`Overall Quality Score: ${result.quality_score}`)
    console.log(`Processing Time: ${result.processing_time}ms`)
    console.log(`Assessments Performed: ${result.metadata.assessments_performed}`)

    console.log('\n🔒 Security Validation:')
    console.log(`Security Score: ${result.metadata.security_score}`)
    
    console.log('\n♿ Accessibility Validation:')
    console.log(`Accessibility Score: ${result.metadata.accessibility_score}`)
    
    console.log('\n📈 Data Quality Validation:')
    console.log(`Data Quality Score: ${result.metadata.data_quality_score}`)
    
    console.log('\n🔗 Cross-Reference Validation:')
    console.log(`Cross-Reference Score: ${result.metadata.cross_reference_score}`)

    console.log('\n📝 Enhanced Validations Summary:')
    const enhancedValidations = result.output_data.enhanced_validations
    console.log(`- Security: ${enhancedValidations.security.passed ? '✅ Passed' : '❌ Failed'}`)
    console.log(`- Accessibility: ${enhancedValidations.accessibility.passed ? '✅ Passed' : '❌ Failed'}`)
    console.log(`- Data Quality: ${enhancedValidations.data_quality.passed ? '✅ Passed' : '❌ Failed'}`)
    console.log(`- Cross-Reference: ${enhancedValidations.cross_reference.passed ? '✅ Passed' : '❌ Failed'}`)

    console.log('\n💡 Quality Recommendations:')
    const recommendations = result.output_data.quality_recommendations
    recommendations.slice(0, 5).forEach((rec: any, index: number) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.title}`)
      console.log(`   ${rec.description}`)
    })

    console.log('\n🎯 Validation Context:')
    const validationContext = result.output_data.quality_metadata.validation_context
    console.log(`Framework: ${validationContext.framework}`)
    console.log(`Security Level: ${validationContext.security_level}`)
    console.log(`Accessibility Level: ${validationContext.accessibility_level}`)
    console.log(`Data Classification: ${validationContext.data_classification}`)

    return result

  } catch (error) {
    console.error('❌ Enhanced Quality Assurance Stage failed:', error)
    throw error
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedQualityAssurance()
    .then(() => {
      console.log('\n🎉 Enhanced Quality Assurance Stage test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Enhanced Quality Assurance Stage test failed:', error)
      process.exit(1)
    })
}

export { testEnhancedQualityAssurance }