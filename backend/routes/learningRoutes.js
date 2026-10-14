import express from 'express';
import { generateRecommendations } from '../services/recommendationEngine.js';

const router = express.Router();

router.get('/learning-recommendations/health', (req, res) => {
  res.json({ status: 'healthy' });
});

router.post('/learning-recommendations', (req, res) => {
  try {
    const {
      disease_category,
      ai_query_category = 'Learning Recommendation',
      learning_topic_viewed = '',
      top_n = 3
    } = req.body;

    if (!disease_category) {
      return res.status(400).json({ message: 'disease_category is required' });
    }

    if (top_n < 1 || top_n > 10) {
      return res.status(400).json({ message: 'top_n must be between 1 and 10' });
    }

    const userProfile = {
      disease_category,
      ai_query_category,
      learning_topic_viewed
    };

    const recommendations = generateRecommendations(userProfile, top_n);
    res.json({ recommendations });

  } catch (error) {
    console.error('[LearningRoutes] Error:', error.message);
    res.status(500).json({ message: 'Recommendation generation failed', error: error.message });
  }
});

export default router;
