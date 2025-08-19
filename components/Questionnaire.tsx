"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, ArrowRight, ArrowLeft, FileText, RotateCcw } from 'lucide-react'

interface QuestionnaireProps {
  onComplete?: (answers: QuestionnaireAnswers) => void
  onSkip?: () => void
  onAnswerChange?: (questionKey: string, value: string) => void
  initialAnswers?: QuestionnaireAnswers
}

export interface QuestionnaireAnswers {
  ageRange: string
  analysisFocus: string
  conversationFeeling: string
  relationshipStage: string
}

const questions = [
  {
    id: 'ageRange',
    question: 'What is your age range?',
    options: [
      { value: '18-24', label: '18-24' },
      { value: '25-34', label: '25-34' },
      { value: '35-44', label: '35-44' },
      { value: '45+', label: '45+' }
    ]
  },
  {
    id: 'analysisFocus',
    question: 'When analyzing this chat log, which aspect would you most like us to focus on?',
    options: [
      { value: 'daily-communication', label: 'The fluency and efficiency of daily communication.' },
      { value: 'emotional-connection', label: 'The depth of emotional connection and mutual understanding.' },
      { value: 'conflict-resolution', label: 'Methods of conflict resolution and handling disagreements.' },
      { value: 'shared-goals', label: 'Shared goals and commitment to the future.' },
      { value: 'comprehensive', label: "I'm not sure, please provide a comprehensive analysis." }
    ]
  },
  {
    id: 'conversationFeeling',
    question: 'Overall, how did the conversation you uploaded make you feel?',
    options: [
      { value: 'very-positive', label: 'Very positive and pleasant' },
      { value: 'mostly-positive', label: 'Mostly positive' },
      { value: 'neutral', label: 'Neutral / A mix of positive and negative' },
      { value: 'mostly-negative', label: 'Mostly negative' },
      { value: 'very-negative', label: 'Very negative and upsetting' }
    ]
  },
  {
    id: 'relationshipStage',
    question: 'What stage is your current relationship in?',
    options: [
      { value: 'dating', label: 'Dating / Early Stage' },
      { value: 'living-together', label: 'Long-term / Living Together' },
      { value: 'married', label: 'Engaged / Married' },
      { value: 'challenges', label: 'Facing Challenges / Seeking Repair' }
    ]
  }
]

export function Questionnaire({ onComplete, onSkip, onAnswerChange, initialAnswers }: QuestionnaireProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>(initialAnswers || {})
  const [isCompleted, setIsCompleted] = useState(false)

  const progress = ((currentQuestion + 1) / questions.length) * 100

  const handleAnswerSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
    
    // Save answer immediately
    if (onAnswerChange) {
      onAnswerChange(questionId, value)
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      setIsCompleted(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    if (onComplete && isAnswersComplete()) {
      onComplete(answers as QuestionnaireAnswers)
    }
  }

  const handleRedo = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setIsCompleted(false)
  }

  const isAnswersComplete = (): boolean => {
    return questions.every(q => answers[q.id as keyof QuestionnaireAnswers])
  }

  const currentQuestionData = questions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id as keyof QuestionnaireAnswers]

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Questionnaire Complete!</CardTitle>
            <CardDescription>
              Thank you for providing this information. It will help us generate a more accurate and personalized analysis of your relationship.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Your Responses:</h4>
              <div className="space-y-2 text-sm text-left">
                <div><strong>Age Range:</strong> {answers.ageRange}</div>
                <div><strong>Focus Area:</strong> {questions[1].options.find(o => o.value === answers.analysisFocus)?.label}</div>
                <div><strong>Conversation Feeling:</strong> {questions[2].options.find(o => o.value === answers.conversationFeeling)?.label}</div>
                <div><strong>Relationship Stage:</strong> {questions[3].options.find(o => o.value === answers.relationshipStage)?.label}</div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleRedo} variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Redo Questionnaire
              </Button>
              <Button onClick={handleComplete} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Generate Personalized Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip Questionnaire
            </Button>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-xl">
            {currentQuestionData?.question}
          </CardTitle>
          <CardDescription>
            Please select the option that best describes your situation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={currentAnswer || ''}
            onValueChange={(value) => handleAnswerSelect(currentQuestionData.id, value)}
          >
            {currentQuestionData?.options.map((option) => (
              <div key={option.value} className="flex items-start space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-1"
                />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer leading-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!currentAnswer}
            >
              {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}