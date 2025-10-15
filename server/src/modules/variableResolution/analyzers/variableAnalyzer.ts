/**
 * Variable Analyzer
 * Analyzes variables for patterns, complexity, and dependencies
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, VariableAnalysis, VariablePattern } from '../types'

export class VariableAnalyzer {
  async analyzeVariables(variables: TemplateVariable[]): Promise<VariableAnalysis> {
    try {
      logger.info('Analyzing variables', {
        variableCount: variables.length
      })

      const analysis: VariableAnalysis = {
        analysis_id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        template_id: 'unknown', // Would be passed from template
        total_variables: variables.length,
        variable_types: await this.analyzeVariableTypes(variables),
        complexity_analysis: await this.analyzeComplexity(variables),
        dependency_analysis: await this.analyzeDependencies(variables),
        quality_analysis: await this.analyzeQuality(variables),
        recommendations: await this.generateAnalysisRecommendations(variables)
      }

      logger.info('Variable analysis completed', {
        totalVariables: analysis.total_variables,
        complexityScore: analysis.complexity_analysis.complexity_score
      })

      return analysis

    } catch (error) {
      logger.error('Variable analysis failed', {
        error: error.message
      })
      throw error
    }
  }

  async detectPatterns(variables: TemplateVariable[]): Promise<VariablePattern[]> {
    try {
      logger.info('Detecting variable patterns', {
        variableCount: variables.length
      })

      const patterns: VariablePattern[] = []

      // Detect naming patterns
      const namingPatterns = await this.detectNamingPatterns(variables)
      patterns.push(...namingPatterns)

      // Detect value patterns
      const valuePatterns = await this.detectValuePatterns(variables)
      patterns.push(...valuePatterns)

      // Detect dependency patterns
      const dependencyPatterns = await this.detectDependencyPatterns(variables)
      patterns.push(...dependencyPatterns)

      logger.info('Variable pattern detection completed', {
        patternCount: patterns.length
      })

      return patterns

    } catch (error) {
      logger.error('Variable pattern detection failed', {
        error: error.message
      })
      throw error
    }
  }

  private async analyzeVariableTypes(variables: TemplateVariable[]): Promise<any[]> {
    const typeCounts: Record<string, number> = {}
    
    for (const variable of variables) {
      typeCounts[variable.variable_type] = (typeCounts[variable.variable_type] || 0) + 1
    }

    return Object.entries(typeCounts).map(([type, count]) => ({
      variable_type: type,
      count,
      percentage: (count / variables.length) * 100,
      complexity_score: this.getTypeComplexityScore(type),
      resolution_difficulty: this.getTypeResolutionDifficulty(type)
    }))
  }

  private async analyzeComplexity(variables: TemplateVariable[]): Promise<any> {
    let complexityScore = 0
    const complexityFactors: any[] = []

    // Factor 1: Variable count
    const countFactor = Math.min(variables.length / 10, 1) * 0.3
    complexityFactors.push({
      factor_name: 'Variable Count',
      factor_score: countFactor,
      factor_weight: 0.3,
      factor_description: `Number of variables: ${variables.length}`
    })
    complexityScore += countFactor

    // Factor 2: Type diversity
    const uniqueTypes = new Set(variables.map(v => v.variable_type)).size
    const typeDiversityFactor = Math.min(uniqueTypes / 5, 1) * 0.2
    complexityFactors.push({
      factor_name: 'Type Diversity',
      factor_score: typeDiversityFactor,
      factor_weight: 0.2,
      factor_description: `Number of unique types: ${uniqueTypes}`
    })
    complexityScore += typeDiversityFactor

    // Factor 3: Constraint complexity
    const constraintComplexity = variables.reduce((sum, v) => {
      return sum + (v.variable_definition.constraints?.length || 0)
    }, 0) / variables.length
    const constraintFactor = Math.min(constraintComplexity / 5, 1) * 0.2
    complexityFactors.push({
      factor_name: 'Constraint Complexity',
      factor_score: constraintFactor,
      factor_weight: 0.2,
      factor_description: `Average constraints per variable: ${constraintComplexity.toFixed(2)}`
    })
    complexityScore += constraintFactor

    // Factor 4: Resolution hints complexity
    const hintComplexity = variables.reduce((sum, v) => {
      return sum + (v.resolution_hints?.length || 0)
    }, 0) / variables.length
    const hintFactor = Math.min(hintComplexity / 3, 1) * 0.3
    complexityFactors.push({
      factor_name: 'Resolution Hints Complexity',
      factor_score: hintFactor,
      factor_weight: 0.3,
      factor_description: `Average hints per variable: ${hintComplexity.toFixed(2)}`
    })
    complexityScore += hintFactor

    return {
      overall_complexity: complexityScore,
      complexity_factors: complexityFactors,
      complexity_score: complexityScore,
      complexity_level: this.getComplexityLevel(complexityScore)
    }
  }

  private async analyzeDependencies(variables: TemplateVariable[]): Promise<any> {
    const dependencies: any[] = []
    const dependencyGraph = {
      nodes: variables.map(v => ({
        node_id: v.variable_id,
        variable_id: v.variable_id,
        node_type: 'variable',
        properties: { name: v.variable_name, type: v.variable_type }
      })),
      edges: [],
      cycles: []
    }

    // Simple dependency detection based on variable names
    for (const variable of variables) {
      const dependsOn: string[] = []
      const dependedBy: string[] = []

      // Check if variable name suggests dependencies
      const variableName = variable.variable_name.toLowerCase()
      for (const otherVariable of variables) {
        if (otherVariable.variable_id !== variable.variable_id) {
          const otherName = otherVariable.variable_name.toLowerCase()
          if (variableName.includes(otherName) || otherName.includes(variableName)) {
            dependsOn.push(otherVariable.variable_id)
            dependedBy.push(variable.variable_id)
          }
        }
      }

      if (dependsOn.length > 0) {
        dependencies.push({
          variable_id: variable.variable_id,
          depends_on: dependsOn,
          depended_by: dependedBy,
          dependency_type: 'direct'
        })
      }
    }

    return {
      variable_dependencies: dependencies,
      dependency_graph: dependencyGraph,
      circular_dependencies: [],
      resolution_order: variables.map(v => v.variable_id)
    }
  }

  private async analyzeQuality(variables: TemplateVariable[]): Promise<any> {
    let overallQuality = 0
    const qualityDimensions: any[] = []

    // Dimension 1: Definition completeness
    const completenessScore = variables.reduce((sum, v) => {
      let score = 0
      if (v.variable_definition.description) score += 0.3
      if (v.variable_definition.default_value !== undefined) score += 0.3
      if (v.variable_definition.examples && v.variable_definition.examples.length > 0) score += 0.2
      if (v.variable_definition.constraints && v.variable_definition.constraints.length > 0) score += 0.2
      return sum + score
    }, 0) / variables.length

    qualityDimensions.push({
      dimension_name: 'Definition Completeness',
      dimension_score: completenessScore,
      dimension_weight: 0.4,
      dimension_description: 'How well variables are defined'
    })
    overallQuality += completenessScore * 0.4

    // Dimension 2: Naming consistency
    const namingScore = this.analyzeNamingConsistency(variables)
    qualityDimensions.push({
      dimension_name: 'Naming Consistency',
      dimension_score: namingScore,
      dimension_weight: 0.3,
      dimension_description: 'Consistency in variable naming'
    })
    overallQuality += namingScore * 0.3

    // Dimension 3: Type appropriateness
    const typeScore = variables.reduce((sum, v) => {
      return sum + (this.isTypeAppropriate(v) ? 1 : 0)
    }, 0) / variables.length

    qualityDimensions.push({
      dimension_name: 'Type Appropriateness',
      dimension_score: typeScore,
      dimension_weight: 0.3,
      dimension_description: 'How appropriate variable types are'
    })
    overallQuality += typeScore * 0.3

    return {
      overall_quality: overallQuality,
      quality_dimensions: qualityDimensions,
      quality_issues: [],
      quality_trends: []
    }
  }

  private async generateAnalysisRecommendations(variables: TemplateVariable[]): Promise<any[]> {
    const recommendations: any[] = []

    // Check for missing descriptions
    const missingDescriptions = variables.filter(v => !v.variable_definition.description)
    if (missingDescriptions.length > 0) {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'variable_definition_improvement',
        recommendation_title: 'Add Variable Descriptions',
        recommendation_description: `${missingDescriptions.length} variables are missing descriptions`,
        priority: 'medium',
        implementation: 'Add descriptions to all variables',
        expected_impact: 0.2
      })
    }

    // Check for missing default values
    const missingDefaults = variables.filter(v => v.variable_definition.default_value === undefined)
    if (missingDefaults.length > 0) {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'variable_definition_improvement',
        recommendation_title: 'Add Default Values',
        recommendation_description: `${missingDefaults.length} variables are missing default values`,
        priority: 'low',
        implementation: 'Add default values to variables where appropriate',
        expected_impact: 0.15
      })
    }

    return recommendations
  }

  private async detectNamingPatterns(variables: TemplateVariable[]): Promise<VariablePattern[]> {
    const patterns: VariablePattern[] = []

    // Detect snake_case pattern
    const snakeCaseVars = variables.filter(v => /^[a-z]+(_[a-z]+)*$/.test(v.variable_name))
    if (snakeCaseVars.length > variables.length * 0.5) {
      patterns.push({
        pattern_id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_name: 'Snake Case Naming',
        pattern_type: 'naming_convention',
        pattern_expression: '^[a-z]+(_[a-z]+)*$',
        pattern_confidence: snakeCaseVars.length / variables.length,
        pattern_frequency: snakeCaseVars.length,
        pattern_examples: snakeCaseVars.slice(0, 3).map(v => v.variable_name),
        pattern_metadata: { convention: 'snake_case' }
      })
    }

    // Detect camelCase pattern
    const camelCaseVars = variables.filter(v => /^[a-z]+([A-Z][a-z]+)*$/.test(v.variable_name))
    if (camelCaseVars.length > variables.length * 0.5) {
      patterns.push({
        pattern_id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_name: 'Camel Case Naming',
        pattern_type: 'naming_convention',
        pattern_expression: '^[a-z]+([A-Z][a-z]+)*$',
        pattern_confidence: camelCaseVars.length / variables.length,
        pattern_frequency: camelCaseVars.length,
        pattern_examples: camelCaseVars.slice(0, 3).map(v => v.variable_name),
        pattern_metadata: { convention: 'camelCase' }
      })
    }

    return patterns
  }

  private async detectValuePatterns(variables: TemplateVariable[]): Promise<VariablePattern[]> {
    const patterns: VariablePattern[] = []

    // Detect common prefixes
    const prefixes: Record<string, number> = {}
    for (const variable of variables) {
      const parts = variable.variable_name.split(/[_-]/)
      if (parts.length > 1) {
        const prefix = parts[0]
        prefixes[prefix] = (prefixes[prefix] || 0) + 1
      }
    }

    for (const [prefix, count] of Object.entries(prefixes)) {
      if (count > 2) {
        patterns.push({
          pattern_id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern_name: `Common Prefix: ${prefix}`,
          pattern_type: 'value_pattern',
          pattern_expression: `^${prefix}[_-]`,
          pattern_confidence: count / variables.length,
          pattern_frequency: count,
          pattern_examples: variables.filter(v => v.variable_name.startsWith(prefix)).slice(0, 3).map(v => v.variable_name),
          pattern_metadata: { prefix, count }
        })
      }
    }

    return patterns
  }

  private async detectDependencyPatterns(variables: TemplateVariable[]): Promise<VariablePattern[]> {
    const patterns: VariablePattern[] = []

    // Detect hierarchical dependencies
    const hierarchicalVars = variables.filter(v => {
      const name = v.variable_name.toLowerCase()
      return name.includes('parent') || name.includes('child') || name.includes('sub')
    })

    if (hierarchicalVars.length > 0) {
      patterns.push({
        pattern_id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_name: 'Hierarchical Dependencies',
        pattern_type: 'dependency_pattern',
        pattern_expression: 'parent|child|sub',
        pattern_confidence: hierarchicalVars.length / variables.length,
        pattern_frequency: hierarchicalVars.length,
        pattern_examples: hierarchicalVars.slice(0, 3).map(v => v.variable_name),
        pattern_metadata: { type: 'hierarchical' }
      })
    }

    return patterns
  }

  private getTypeComplexityScore(type: string): number {
    const complexityScores: Record<string, number> = {
      'string': 0.2,
      'number': 0.3,
      'boolean': 0.1,
      'date': 0.4,
      'array': 0.6,
      'object': 0.7,
      'json': 0.8,
      'markdown': 0.5,
      'html': 0.5,
      'computed': 0.9,
      'conditional': 0.8
    }
    return complexityScores[type] || 0.5
  }

  private getTypeResolutionDifficulty(type: string): 'low' | 'medium' | 'high' {
    const difficultyScores: Record<string, 'low' | 'medium' | 'high'> = {
      'string': 'low',
      'number': 'low',
      'boolean': 'low',
      'date': 'medium',
      'array': 'medium',
      'object': 'high',
      'json': 'high',
      'markdown': 'medium',
      'html': 'medium',
      'computed': 'high',
      'conditional': 'high'
    }
    return difficultyScores[type] || 'medium'
  }

  private getComplexityLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score < 0.3) return 'low'
    if (score < 0.6) return 'medium'
    if (score < 0.8) return 'high'
    return 'very_high'
  }

  private analyzeNamingConsistency(variables: TemplateVariable[]): number {
    if (variables.length === 0) return 1

    const namingStyles = variables.map(v => {
      const name = v.variable_name
      if (/^[a-z]+(_[a-z]+)*$/.test(name)) return 'snake_case'
      if (/^[a-z]+([A-Z][a-z]+)*$/.test(name)) return 'camelCase'
      if (/^[A-Z]+(_[A-Z]+)*$/.test(name)) return 'SCREAMING_SNAKE_CASE'
      return 'mixed'
    })

    const styleCounts = namingStyles.reduce((acc, style) => {
      acc[style] = (acc[style] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dominantStyle = Object.entries(styleCounts).reduce((a, b) => 
      styleCounts[a[0]] > styleCounts[b[0]] ? a : b
    )

    return dominantStyle[1] / variables.length
  }

  private isTypeAppropriate(variable: TemplateVariable): boolean {
    const name = variable.variable_name.toLowerCase()
    const type = variable.variable_type

    // Simple heuristics for type appropriateness
    if (name.includes('count') || name.includes('number') || name.includes('size')) {
      return type === 'number'
    }
    if (name.includes('date') || name.includes('time')) {
      return type === 'date'
    }
    if (name.includes('list') || name.includes('array')) {
      return type === 'array'
    }
    if (name.includes('config') || name.includes('settings')) {
      return type === 'object' || type === 'json'
    }

    return true // Default to appropriate if no clear indicators
  }
}

