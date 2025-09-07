const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { ClassItem: Class } = require('../models/Class')
const { Transaction } = require('../models/Transaction')
const { Task } = require('../models/Task')

const router = express.Router()

// Test endpoint to verify AI routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'AI routes are working!', timestamp: new Date().toISOString() })
})

// AI Study Recommendations based on user patterns
router.get('/study-recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id
    
    // Get user's study data
    console.log('Fetching data for userId:', userId)
    const tasks = await Task.find({ userId, completed: true }).sort({ completedAt: -1 }).limit(50)
    const classes = await Class.find({ userId })
    console.log('Found tasks:', tasks.length, 'classes:', classes.length)
    
    // Analyze patterns
    const subjectPerformance = {}
    const timePatterns = {}
    
    tasks.forEach(task => {
      if (!subjectPerformance[task.subject]) {
        subjectPerformance[task.subject] = { total: 0, completed: 0, avgTime: 0 }
      }
      subjectPerformance[task.subject].total++
      subjectPerformance[task.subject].completed++
      
      const hour = new Date(task.completedAt).getHours()
      if (!timePatterns[hour]) timePatterns[hour] = 0
      timePatterns[hour]++
    })
    
    // Generate AI recommendations
    const recommendations = []
    
    // Subject-based recommendations
    Object.entries(subjectPerformance).forEach(([subject, data]) => {
      if (data.completed < 3) {
        recommendations.push({
          type: 'subject',
          priority: 'high',
          message: `Focus more on ${subject} - you've only completed ${data.completed} tasks in this subject.`,
          action: `Schedule dedicated study time for ${subject}`
        })
      }
    })
    
    // Time optimization
    const bestHours = Object.entries(timePatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))
    
    if (bestHours.length > 0) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        message: `Your most productive study hours are ${bestHours.map(h => `${h}:00`).join(', ')}.`,
        action: 'Schedule important tasks during these peak hours'
      })
    }
    
    // Schedule gaps
    const today = new Date()
    const dayOfWeek = today.getDay()
    const todayClasses = classes.filter(c => c.day === dayOfWeek)
    
    if (todayClasses.length < 3) {
      recommendations.push({
        type: 'schedule',
        priority: 'low',
        message: `You have ${3 - todayClasses.length} free time slots today.`,
        action: 'Use this time for focused study sessions'
      })
    }
    
    res.json({ recommendations })
  } catch (error) {
    console.error('Study recommendations error:', error)
    res.status(500).json({ error: 'Failed to generate study recommendations', details: error.message })
  }
})

// AI Schedule Optimization
router.post('/optimize-schedule', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id
    const { tasks, preferences } = req.body
    
    // Get user's class schedule
    console.log('Fetching classes for userId:', userId)
    const classes = await Class.find({ userId })
    console.log('Found classes:', classes.length)
    
    // AI algorithm to optimize task scheduling
    const optimizedSchedule = []
    const availableSlots = []
    
    // Find available time slots (assuming 1-hour blocks)
    for (let day = 0; day < 7; day++) {
      const dayClasses = classes.filter(c => {
        // Convert day names to numbers (0=Sunday, 1=Monday, etc.)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return dayNames[day] === c.day
      })
      
      const busyHours = dayClasses.map(c => {
        // Extract hour from time string (e.g., "14:00" -> 14)
        const hour = parseInt(c.startTime ? c.startTime.split(':')[0] : c.time ? c.time.split(':')[0] : 9)
        return hour
      })
      
      // Create available slots from 8 AM to 10 PM
      for (let hour = 8; hour < 22; hour++) {
        if (!busyHours.includes(hour)) {
          availableSlots.push({ day, hour, priority: 0, dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] })
        }
      }
    }
    
    // Prioritize tasks by deadline and importance
    const prioritizedTasks = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const now = new Date()
        const aDeadline = new Date(a.deadline)
        const bDeadline = new Date(b.deadline)
        
        // Calculate days until deadline
        const aDaysLeft = Math.max(0, Math.ceil((aDeadline - now) / (1000 * 60 * 60 * 24)))
        const bDaysLeft = Math.max(0, Math.ceil((bDeadline - now) / (1000 * 60 * 60 * 24)))
        
        // Priority multiplier
        const priorityMultiplier = { high: 3, medium: 2, low: 1 }
        const aScore = priorityMultiplier[a.priority] * (1 / Math.max(1, aDaysLeft))
        const bScore = priorityMultiplier[b.priority] * (1 / Math.max(1, bDaysLeft))
        
        return bScore - aScore
      })
    
    // Assign tasks to optimal time slots
    prioritizedTasks.forEach(task => {
      const bestSlot = availableSlots
        .filter(slot => slot.priority === 0)
        .sort((a, b) => {
          // Prefer morning slots for high-priority tasks
          const aScore = a.hour < 12 ? 2 : 1
          const bScore = b.hour < 12 ? 2 : 1
          return bScore - aScore
        })[0]
      
      if (bestSlot) {
        optimizedSchedule.push({
          task: task.topic,
          subject: task.subject,
          day: bestSlot.day,
          dayName: bestSlot.dayName,
          hour: bestSlot.hour,
          priority: task.priority,
          deadline: task.deadline,
          estimatedDuration: '1 hour' // Default duration
        })
        bestSlot.priority = 1
      }
    })
    
    // Add AI recommendations
    const recommendations = []
    if (optimizedSchedule.length === 0) {
      recommendations.push("No tasks to schedule. Add some tasks first!")
    } else if (optimizedSchedule.length < tasks.filter(t => !t.completed).length) {
      recommendations.push("Some tasks couldn't be scheduled due to limited available time slots.")
    }
    
    // Add time management tips
    if (optimizedSchedule.filter(s => s.priority === 'high').length > 0) {
      recommendations.push("High-priority tasks are scheduled during your most productive hours.")
    }
    
    res.json({ 
      optimizedSchedule,
      recommendations,
      availableSlots: availableSlots.length,
      message: 'AI has optimized your study schedule based on your class times and task priorities'
    })
  } catch (error) {
    console.error('Schedule optimization error:', error)
    res.status(500).json({ error: 'Failed to optimize schedule', details: error.message })
  }
})

// AI Budget Insights
router.get('/budget-insights', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query
    
    // Get monthly transactions
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    console.log('Fetching transactions for userId:', userId, 'month:', month, 'year:', year)
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    })
    console.log('Found transactions:', transactions.length)
    
    // Analyze spending patterns
    const categorySpending = {}
    const dailySpending = {}
    let totalIncome = 0
    let totalExpense = 0
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount
      } else {
        totalExpense += t.amount
        if (!categorySpending[t.category]) categorySpending[t.category] = 0
        categorySpending[t.category] += t.amount
        
        const day = new Date(t.date).getDate()
        if (!dailySpending[day]) dailySpending[day] = 0
        dailySpending[day] += t.amount
      }
    })
    
    // Generate AI insights
    const insights = []
    
    // Basic financial health check
    if (totalIncome === 0 && totalExpense === 0) {
      insights.push({
        type: 'info',
        message: 'No financial data found for this month.',
        recommendation: 'Start tracking your income and expenses to get personalized insights'
      })
    } else {
      // Spending category analysis
      if (Object.keys(categorySpending).length > 0) {
        const topCategory = Object.entries(categorySpending)
          .sort(([,a], [,b]) => b - a)[0]
        
        if (topCategory) {
          const percentage = ((topCategory[1] / totalExpense) * 100).toFixed(1)
          insights.push({
            type: 'spending',
            message: `${topCategory[0]} accounts for ${percentage}% of your expenses this month.`,
            recommendation: percentage > 40 ? 'This category is taking up a large portion of your budget. Consider setting spending limits.' : 
                          percentage > 25 ? 'Monitor this category to ensure it stays within reasonable limits.' : 'Good balance in this category.'
          })
        }
        
        // Category diversity analysis
        const categoryCount = Object.keys(categorySpending).length
        if (categoryCount < 3) {
          insights.push({
            type: 'diversity',
            message: `You're spending in only ${categoryCount} categories this month.`,
            recommendation: 'Consider diversifying your spending to better track where your money goes'
          })
        }
      }
      
      // Income vs Expense analysis
      if (totalIncome > 0) {
        const expenseRatio = (totalExpense / totalIncome * 100).toFixed(1)
        if (expenseRatio > 90) {
          insights.push({
            type: 'warning',
            message: `Your expenses are ${expenseRatio}% of your income.`,
            recommendation: 'Try to reduce expenses or increase income to build savings'
          })
        } else if (expenseRatio > 80) {
          insights.push({
            type: 'caution',
            message: `Your expenses are ${expenseRatio}% of your income.`,
            recommendation: 'Good control, but aim to keep expenses under 80% for better financial health'
          })
        } else {
          insights.push({
            type: 'success',
            message: `Your expenses are ${expenseRatio}% of your income.`,
            recommendation: 'Excellent financial management! You\'re living well within your means'
          })
        }
      }
      
      // Savings rate analysis
      if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)
        if (savingsRate < 0) {
          insights.push({
            type: 'danger',
            message: `You're spending ${Math.abs(savingsRate)}% more than you earn this month.`,
            recommendation: 'Immediate action needed: reduce expenses or find additional income sources'
          })
        } else if (savingsRate < 10) {
          insights.push({
            type: 'warning',
            message: `Your savings rate is ${savingsRate}%.`,
            recommendation: 'Aim for at least 10% savings rate for financial security'
          })
        } else if (savingsRate < 20) {
          insights.push({
            type: 'caution',
            message: `Your savings rate is ${savingsRate}%.`,
            recommendation: 'Good progress! Aim for 20% savings rate for better financial freedom'
          })
        } else {
          insights.push({
            type: 'success',
            message: `Your savings rate is ${savingsRate}%.`,
            recommendation: 'Outstanding! You\'re building excellent financial security'
          })
        }
      }
      
      // Spending pattern analysis
      if (Object.keys(dailySpending).length > 0) {
        const avgDailySpending = totalExpense / Object.keys(dailySpending).length
        const highSpendingDays = Object.entries(dailySpending)
          .filter(([, amount]) => amount > avgDailySpending * 1.5)
        
        if (highSpendingDays.length > 0) {
          insights.push({
            type: 'pattern',
            message: `You have ${highSpendingDays.length} high-spending days this month (spending >${(avgDailySpending * 1.5).toFixed(0)}).`,
            recommendation: 'Identify what triggers high-spending days and plan your budget accordingly'
          })
        }
        
        // Weekly spending analysis
        const weeklySpending = {}
        transactions.forEach(t => {
          if (t.type === 'expense') {
            const week = Math.ceil(new Date(t.date).getDate() / 7)
            if (!weeklySpending[week]) weeklySpending[week] = 0
            weeklySpending[week] += t.amount
          }
        })
        
        if (Object.keys(weeklySpending).length > 1) {
          const weeks = Object.values(weeklySpending)
          const avgWeekly = weeks.reduce((a, b) => a + b, 0) / weeks.length
          const maxWeek = Math.max(...weeks)
          const minWeek = Math.min(...weeks)
          
          if (maxWeek > avgWeekly * 1.3) {
            insights.push({
              type: 'pattern',
              message: `Your spending varies significantly between weeks (${minWeek.toFixed(0)} to ${maxWeek.toFixed(0)}).`,
              recommendation: 'Try to maintain more consistent weekly spending for better budget control'
            })
          }
        }
      }
      
      // Goal-based insights
      if (totalIncome > 0 && totalExpense > 0) {
        const monthlySavings = totalIncome - totalExpense
        if (monthlySavings > 0) {
          insights.push({
            type: 'goal',
            message: `You're saving $${monthlySavings.toFixed(2)} monthly.`,
            recommendation: 'Consider setting specific savings goals and automating transfers'
          })
        }
      }
    }
    
    res.json({ 
      insights, 
      summary: { 
        totalIncome, 
        totalExpense, 
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
        transactionCount: transactions.length,
        categoryCount: Object.keys(categorySpending).length
      } 
    })
  } catch (error) {
    console.error('Budget insights error:', error)
    res.status(500).json({ error: 'Failed to generate budget insights', details: error.message })
  }
})

// AI Task Prioritization
router.post('/prioritize-tasks', requireAuth, async (req, res) => {
  try {
    const { tasks } = req.body
    
    // AI prioritization algorithm
    const prioritizedTasks = tasks.map(task => {
      const now = new Date()
      const deadline = new Date(task.deadline)
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
      
      // Calculate priority score
      let score = 0
      
      // Priority level (high=3, medium=2, low=1)
      const priorityMultiplier = { high: 3, medium: 2, low: 1 }
      score += priorityMultiplier[task.priority] * 10
      
      // Urgency (deadline proximity)
      if (daysUntilDeadline <= 1) score += 20
      else if (daysUntilDeadline <= 3) score += 15
      else if (daysUntilDeadline <= 7) score += 10
      else if (daysUntilDeadline <= 14) score += 5
      
      // Subject importance (you can customize this)
      const subjectImportance = {
        'Mathematics': 8,
        'Science': 7,
        'English': 6,
        'History': 5,
        'default': 4
      }
      score += subjectImportance[task.subject] || subjectImportance.default
      
      return { ...task, aiPriority: score }
    }).sort((a, b) => b.aiPriority - a.aiPriority)
    
    // Group by priority level
    const highPriority = prioritizedTasks.filter(t => t.aiPriority >= 25)
    const mediumPriority = prioritizedTasks.filter(t => t.aiPriority >= 15 && t.aiPriority < 25)
    const lowPriority = prioritizedTasks.filter(t => t.aiPriority < 15)
    
    res.json({
      prioritizedTasks,
      recommendations: {
        highPriority: highPriority.length > 0 ? `Focus on ${highPriority.length} high-priority tasks first` : 'No urgent tasks',
        mediumPriority: mediumPriority.length > 0 ? `${mediumPriority.length} tasks need attention soon` : 'Good progress',
        lowPriority: lowPriority.length > 0 ? `${lowPriority.length} tasks can wait` : 'All tasks are prioritized'
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to prioritize tasks' })
  }
})

// AI Study Buddy Chat
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body
    
    // Use Gemini AI for intelligent responses
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const prompt = `You are a helpful AI study assistant for students. The student asked: "${message}"

Please provide a helpful, encouraging, and practical response. Focus on:
- Study techniques and strategies
- Time management advice
- Motivation and mindset tips
- Academic success strategies
- Practical actionable steps

Keep your response conversational, friendly, and under 150 words. Be specific and helpful.

Response:`
      
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      // Generate contextual suggestions based on the response
      const suggestions = [
        "Ask me about study techniques",
        "Get help with time management", 
        "Need motivation tips?",
        "Ask about exam preparation"
      ]
      
      res.json({
        response: response.trim(),
        context: 'ai',
        suggestions,
        isAI: true
      })
    } else {
      // Fallback to predefined responses if no Gemini key
      const responses = {
        study: [
          "Try the Pomodoro technique: 25 minutes of focused study followed by a 5-minute break.",
          "Break down complex topics into smaller, manageable chunks.",
          "Use active recall techniques like flashcards or explaining concepts to yourself.",
          "Study in different environments to improve memory retention."
        ],
        schedule: [
          "Prioritize tasks by deadline and importance using the AI prioritization tool.",
          "Schedule your most challenging subjects during your peak energy hours.",
          "Leave buffer time between study sessions for breaks and review.",
          "Use the schedule optimization feature to find the best study times."
        ],
        budget: [
          "Track all expenses, even small ones, to identify spending patterns.",
          "Set up automatic savings transfers to build good habits.",
          "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
          "Review your budget insights regularly to stay on track."
        ],
        motivation: [
          "Remember why you started - visualize your long-term goals.",
          "Celebrate small wins and progress, not just final results.",
          "Find a study buddy or join a study group for accountability.",
          "Take care of your physical health - sleep, exercise, and nutrition matter."
        ]
      }
      
      let contextType = 'motivation'
      if (message.toLowerCase().includes('study') || message.toLowerCase().includes('learn')) {
        contextType = 'study'
      } else if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('time')) {
        contextType = 'schedule'
      } else if (message.toLowerCase().includes('budget') || message.toLowerCase().includes('money')) {
        contextType = 'budget'
      }
      
      const possibleResponses = responses[contextType]
      const response = possibleResponses[Math.floor(Math.random() * possibleResponses.length)]
      
      res.json({
        response,
        context: contextType,
        suggestions: [
          "Ask me about study techniques",
          "Get help with scheduling",
          "Learn about budgeting tips",
          "Need motivation?"
        ],
        isAI: false
      })
    }
  } catch (error) {
    console.error('AI Study Buddy error:', error)
    res.status(500).json({ error: 'Failed to process chat message' })
  }
})

// Flashcards Generator
router.post('/flashcards', requireAuth, async (req, res) => {
  try {
    const { topic = '', text = '', count = 8, difficulty = 'medium' } = req.body || {}
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })

    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const safeTopic = String(topic || '').slice(0, 120)
    const safeText = String(text || '').slice(0, 4000)

    const prompt = `Generate ${count} concise flashcards at ${difficulty} difficulty.
Return ONLY valid JSON array of objects with fields: question (string), answer (string).
Make questions short and answers precise.
Topic: ${safeTopic}
Source Notes:
${safeText}
`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()

    // Try to extract JSON array
    const jsonMatch = raw.match(/\[([\s\S]*)\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : raw
    let data
    try { data = JSON.parse(jsonText) } catch (e) {
      return res.status(500).json({ error: 'AI returned invalid JSON' })
    }

    const flashcards = Array.isArray(data) ? data
      .map((x) => ({
        question: String(x.question || '').slice(0, 300),
        answer: String(x.answer || '').slice(0, 600)
      }))
      .filter((x) => x.question && x.answer) : []

    if (flashcards.length === 0) return res.status(500).json({ error: 'No flashcards generated' })

    res.json({ flashcards })
  } catch (e) {
    console.error('Flashcards error:', e)
    res.status(500).json({ error: 'Failed to generate flashcards' })
  }
})

// Quiz Generator
router.post('/quiz', requireAuth, async (req, res) => {
  try {
    const { topic = '', text = '', count = 6, difficulty = 'medium' } = req.body || {}
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })

    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const safeTopic = String(topic || '').slice(0, 120)
    const safeText = String(text || '').slice(0, 4000)

    const prompt = `Generate ${count} multiple choice quiz questions at ${difficulty} difficulty.
Return ONLY valid JSON array of objects with fields: question (string), options (array of 4 strings), correctAnswer (string).
Make questions clear and options plausible but only one correct.
Topic: ${safeTopic}
Source Notes:
${safeText}
`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()

    // Try to extract JSON array
    const jsonMatch = raw.match(/\[([\s\S]*)\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : raw
    let data
    try { data = JSON.parse(jsonText) } catch (e) {
      return res.status(500).json({ error: 'AI returned invalid JSON' })
    }

    const quiz = Array.isArray(data) ? data
      .map((x) => ({
        question: String(x.question || '').slice(0, 300),
        options: Array.isArray(x.options) ? x.options.slice(0, 4).map(opt => String(opt).slice(0, 200)) : [],
        correctAnswer: String(x.correctAnswer || '').slice(0, 200)
      }))
      .filter((x) => x.question && x.options.length === 4 && x.correctAnswer) : []

    if (quiz.length === 0) return res.status(500).json({ error: 'No quiz questions generated' })

    res.json({ quiz })
  } catch (e) {
    console.error('Quiz error:', e)
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

// Test endpoint for mind map
router.get('/mindmap/test', (req, res) => {
  res.json({ message: 'Mind map endpoint is working' })
})

// Mind Map Generator for QA Page
router.post('/mindmap', requireAuth, async (req, res) => {
  try {
    console.log('Mind map request received:', req.body)
    const { topic = '', text = '', count = 6, difficulty = 'medium' } = req.body || {}
    if (!process.env.GEMINI_API_KEY) {
      console.log('Missing GEMINI_API_KEY')
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const safeTopic = String(topic || '').slice(0, 120)
    const safeText = String(text || '').slice(0, 4000)

    const prompt = `Generate a comprehensive mind map structure for the topic "${safeTopic}" based on the provided notes.
Return ONLY valid JSON object with this structure:
{
  "center": {
    "id": "center",
    "text": "string"
  },
  "nodes": [
    {
      "id": "string",
      "text": "string",
      "connections": ["string", "string"],
      "level": 1,
      "category": "string"
    }
  ]
}

Create a central topic node and ${Math.min(count, 12)} related nodes with hierarchical connections.
Include main branches and sub-branches for comprehensive coverage.
Make it detailed and well-organized for studying.
Difficulty: ${difficulty}
Source Notes:
${safeText}

Focus on creating a logical hierarchy with main concepts branching into sub-concepts.
`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()

    // Try to extract JSON object
    const jsonMatch = raw.match(/\{([\s\S]*)\}/)
    const jsonText = jsonMatch ? jsonMatch[0] : raw
    let data
    try { data = JSON.parse(jsonText) } catch (e) {
      return res.status(500).json({ error: 'AI returned invalid JSON' })
    }

    // Validate and clean the mind map structure
    const nodes = Array.isArray(data.nodes) ? data.nodes.slice(0, 12).map((node, index) => ({
      id: String(node.id || `node_${index}`).slice(0, 50),
      text: String(node.text || '').slice(0, 100),
      connections: Array.isArray(node.connections) ? node.connections.slice(0, 6) : [],
      level: Number(node.level) || 1,
      category: String(node.category || 'general').slice(0, 30)
    })).filter(node => node.text) : []

    // Create hierarchical structure
    const mainNodes = nodes.filter(node => node.level === 1)
    const subNodes = nodes.filter(node => node.level === 2)

    const mindmap = {
      center: {
        id: 'center',
        text: String(data.center?.text || safeTopic || 'Untitled').slice(0, 100),
        connections: mainNodes.slice(0, 8).map(node => ({ id: node.id }))
      },
      nodes: nodes,
      structure: {
        mainBranches: mainNodes.length,
        subBranches: subNodes.length,
        totalNodes: nodes.length
      }
    }

    if (mindmap.nodes.length === 0) return res.status(500).json({ error: 'No mind map structure generated' })

    res.json({ mindmap })
  } catch (e) {
    console.error('Mind map error:', e)
    res.status(500).json({ error: 'Failed to generate mind map' })
  }
})

module.exports = router 