import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Questionnaire } from '../components/Questionnaire'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function QuestionnairePage() {
  const router = useRouter()
  const { sessionId } = router.query
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [initialAnswers, setInitialAnswers] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      setUser(session.user)
      
      // Load existing questionnaire answers if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('age_range, default_focus, relationship_stage, conversation_feeling')
        .eq('id', session.user.id)
        .single()

      if (profile && profile.age_range) {
        setInitialAnswers({
          ageRange: profile.age_range,
          analysisFocus: profile.default_focus || '',
          conversationFeeling: profile.conversation_feeling || '',
          relationshipStage: profile.relationship_stage || ''
        })
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save individual answer immediately
  const handleAnswerChange = async (questionKey, value) => {
    if (!user) return
    
    try {
      const updateField = {
        ageRange: 'age_range',
        analysisFocus: 'default_focus', 
        relationshipStage: 'relationship_stage',
        conversationFeeling: 'conversation_feeling'
      }[questionKey]
      
      if (updateField) {
        await supabase
          .from('profiles')
          .update({
            [updateField]: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }

  const handleQuestionnaireComplete = async (answers) => {
    try {
      setLoading(true)

      // Save answers to profiles table (final save to ensure consistency)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          age_range: answers.ageRange,
          default_focus: answers.analysisFocus,
          relationship_stage: answers.relationshipStage,
          conversation_feeling: answers.conversationFeeling,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('Error saving questionnaire:', profileError)
        return
      }

      // Redirect to upload page with questionnaire completion flag
      if (sessionId) {
        router.push(`/upload?sessionId=${sessionId}&questionnaireComplete=true`)
      } else {
        router.push('/upload?questionnaireComplete=true')
      }
    } catch (error) {
      console.error('Error completing questionnaire:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (sessionId) {
      router.push(`/upload?sessionId=${sessionId}`)
    } else {
      router.push('/upload')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Relationship Questionnaire
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help us provide you with more accurate and personalized relationship insights by answering a few quick questions about yourself and your relationship.
          </p>
        </div>
        
        <Questionnaire
          onComplete={handleQuestionnaireComplete}
          onSkip={handleSkip}
          onAnswerChange={handleAnswerChange}
          initialAnswers={initialAnswers}
        />
      </div>
    </div>
  )
}