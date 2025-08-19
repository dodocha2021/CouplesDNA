import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { generateSessionId } from '../lib/utils';

export const useReportGenerator = ({ sessionId, setSessionId }) => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState('');
  const [reportCheckInterval, setReportCheckInterval] = useState(null);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (reportCheckInterval) {
        clearInterval(reportCheckInterval);
      }
    };
  }, [reportCheckInterval]);

  const handleGenerateReport = async () => {
    if (generatingReport) return;
    
    console.log('🚀 Starting report generation...');
    setGeneratingReport(true);
    setReportProgress('Sending request to AI...');
    
    let sid = sessionId;
    if (!sid) {
      sid = generateSessionId();
      setSessionId(sid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sessionId', sid);
      }
    }
    
    console.log('📋 Session ID:', sid);

    try {
      console.log('📤 Sending request to API route...');
      const response = await axios.post('/api/generate-report', {
        sessionId: sid
      }, { 
        headers: { 'Content-Type': 'application/json' } 
      });

      console.log('✅ API response received:', response.data);

      console.log('⏳ Starting to check for report every 60 seconds...');
      setReportProgress('AI is generating your report... Please wait 5 seconds before first check.');
      
      let checkCount = 0;
      const maxChecks = 20; // 20 checks = 10 minutes
      
      const checkForReport = async () => {
        checkCount++;
        console.log(`🔍 Check #${checkCount} for report data...`);
        setReportProgress(`AI is generating your report... (Check ${checkCount}/${maxChecks})`);
        
        try {
          const { data, error } = await supabase
            .from('n8n_chat_histories')
            .select('message')
            .eq('session_id', sid)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('📊 Database query result:', { data, error });

          if (!error && data && data.length > 0) {
            console.log('📝 Found message in database:', data[0]);
            const latestMessage = data[0].message;
            console.log('📄 Latest message:', latestMessage);
            
            if (latestMessage.type === 'ai' && latestMessage.content) {
              console.log('🤖 AI message found, checking if it\'s a report...');
              
              if (typeof latestMessage.content === 'string' && latestMessage.content.trim().startsWith('{')) {
                try {
                  const content = JSON.parse(latestMessage.content);
                  console.log('🔍 Parsed content:', content);
                  
                  if (content.output && content.output.reportTitle) {
                    console.log('✅ Report found! Redirecting to report page...');
                    setReportProgress('Report generated! Redirecting...');
                    
                    if (reportCheckInterval) {
                      clearInterval(reportCheckInterval);
                    }
                    
                    window.location.href = `/report/${sid}`;
                    return;
                  } else {
                    console.log('❌ No reportTitle found in content.output:', content.output);
                  }
                } catch (parseError) {
                  console.error('❌ Failed to parse report content:', parseError);
                  console.log('📝 This appears to be a chat message, not a report. Continuing to wait for report...');
                }
              } else {
                console.log('📝 Content is not JSON format, likely a chat message. Continuing to wait for report...');
              }
            }
          }
          
          if (checkCount >= maxChecks) {
            console.log('❌ Max checks reached, stopping polling');
            setReportProgress('Report generation timed out. Please try again.');
            alert('Report generation timed out. Please try again.');
            if (reportCheckInterval) {
              clearInterval(reportCheckInterval);
            }
            setGeneratingReport(false);
            return;
          }
          
        } catch (checkError) {
          console.error('❌ Error checking report:', checkError);
          if (checkCount >= maxChecks) {
            alert('Failed to generate report. Please try again.');
            if (reportCheckInterval) {
              clearInterval(reportCheckInterval);
            }
            setGeneratingReport(false);
          }
        }
      };
      
      // Start checking after 5 seconds, then every 60 seconds
      setTimeout(async () => {
        await checkForReport();
      }, 5000);
      
      const interval = setInterval(checkForReport, 60000);
      setReportCheckInterval(interval);
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      setReportProgress('Request failed. Please try again.');
      alert('Failed to generate report. Please try again.');
      setGeneratingReport(false);
    }
  };

  return {
    generatingReport,
    reportProgress,
    handleGenerateReport,
  };
};