const express = require('express');

const Feedback = require('../models/Feedback');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { onboardingEaseRating, uiRating, wouldUseAgain, favoriteFeature, comments } = req.body;

    if (
      onboardingEaseRating == null ||
      uiRating == null ||
      wouldUseAgain == null ||
      onboardingEaseRating < 1 ||
      onboardingEaseRating > 5 ||
      uiRating < 1 ||
      uiRating > 5
    ) {
      return res.status(400).json({
        error: 'onboardingEaseRating and uiRating must be 1-5, and wouldUseAgain must be true/false.',
      });
    }

    const feedback = await Feedback.create({
      user: req.user.id,
      onboardingEaseRating,
      uiRating,
      wouldUseAgain,
      favoriteFeature,
      comments,
    });

    return res.status(201).json(feedback);
  } catch (err) {
    return next(err);
  }
});

/**
 * Aggregated summary endpoint — generates exactly the kind of "80% liked
 * expense tracking" rollup the submission checklist asks for, computed
 * from real responses instead of hand-written.
 */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const all = await Feedback.find({});
    const count = all.length;

    if (count === 0) {
      return res.json({ count: 0, message: 'No feedback collected yet.' });
    }

    const avgOnboarding = all.reduce((s, f) => s + f.onboardingEaseRating, 0) / count;
    const avgUi = all.reduce((s, f) => s + f.uiRating, 0) / count;
    const wouldUsePercent = (all.filter((f) => f.wouldUseAgain).length / count) * 100;

    const featureCounts = {};
    all.forEach((f) => {
      if (!f.favoriteFeature) return;
      const key = f.favoriteFeature.trim().toLowerCase();
      featureCounts[key] = (featureCounts[key] || 0) + 1;
    });

    return res.json({
      count,
      avgOnboardingEaseRating: Number(avgOnboarding.toFixed(2)),
      avgUiRating: Number(avgUi.toFixed(2)),
      wouldUseAgainPercent: Number(wouldUsePercent.toFixed(1)),
      favoriteFeatureCounts: featureCounts,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
