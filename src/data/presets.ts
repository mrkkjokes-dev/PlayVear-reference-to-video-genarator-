import { PresetPresenter } from '../types';

export const PRESET_PRESENTERS: PresetPresenter[] = [
  {
    id: 'bd-tv-anchor',
    name: 'Rakib Hasan',
    banglaName: 'রাকিব হাসান',
    title: 'TV Presenter',
    role: 'TV News Anchor',
    imagePath: '/src/assets/images/bd_tv_anchor_presenter_1792633346511.jpg',
    recommendedPrompt:
      'রেফারেন্স ছবির চেহারা, হেয়ার স্টাইল, পোশাক ও ব্যাকগ্রাউন্ড ১০০% অবিকল বজায় রেখে ভিডিও থেকে কথা বলার স্টাইল, বডি ল্যাঙ্গুয়েজ, মাথার স্বাভাবিক নড়াচড়া, আইব্রু এক্সপ্রেশন, চোখের স্বাভাবিক পলক ফেলা ও নিখুঁত লিপ-সিঙ্ক সহ হুবহু রিয়েলিস্টিক প্রেজেন্টেশন তৈরি করুন।',
    audioName: 'TV Presenter Bulletin (12s)',
    audioStyle: 'anchor',
    duration: 12,
  },
  {
    id: 'bd-keynote-speaker',
    name: 'Sharmin Akter',
    banglaName: 'শারমিন আক্তার',
    title: 'Keynote Speaker',
    role: 'Summit Keynote Speaker',
    imagePath: '/src/assets/images/sample_presenter_female_1792623750052.jpg',
    recommendedPrompt:
      'রেফারেন্স ছবির ব্যক্তি, হেয়ার স্টাইল, পোশাক ও ব্যাকগ্রাউন্ড অবিকল রেখে কথা বলার স্টাইল, সাবলীল অঙ্গভঙ্গি, হেড মুভমেন্ট, চোখের পলক ও নিখুঁত লিপ-সিঙ্ক সহ রিয়েলিস্টিক কি-নোট স্পিচ তৈরি করুন।',
    audioName: 'Keynote Speaker Speech (12s)',
    audioStyle: 'anchor',
    duration: 12,
  },
  {
    id: 'bd-tech-reviewer',
    name: 'Taniya Rahman',
    banglaName: 'তানিয়া রহমান',
    title: 'Tech Reviewer',
    role: 'Tech Host & Reviewer',
    imagePath: '/src/assets/images/bd_content_creator_presenter_1792633348521.jpg',
    recommendedPrompt:
      'রেফারেন্স ছবির চেহারা, পোশাক ও ব্যাকগ্রাউন্ড ১০০% বজায় রেখে টেক রিভিউয়ারের মতো আকর্ষণীয় কথা বলার স্টাইল, বডি ল্যাঙ্গুয়েজ, আইব্রু ও ফেস এক্সপ্রেশন এবং নিখুঁত লিপ-সিঙ্ক সহ ভিডিও তৈরি করুন।',
    audioName: 'Tech Reviewer Podcast (12s)',
    audioStyle: 'creator',
    duration: 12,
  },
];

export const STUDIO_BACKDROP = '/src/assets/images/sample_studio_backdrop_1792623750431.jpg';

export const PROMPT_PRESETS = [
  {
    label: 'TV News Bulletin',
    bangla: 'টিভি নিউজ বুলেটিন',
    prompt:
      'Strictly preserve 100% exact facial identity, clothing, and background from the reference photo without changes. Animate natural television news presenting speech expressions, subtle head tilts, direct eye contact, and flawless lip synchronization.',
  },
  {
    label: 'Creator Studio & Podcast',
    bangla: 'ক্রিয়েটর পডকাস্ট',
    prompt:
      'Strictly preserve exact character appearance, outfit, and background environment from reference image. Animate authentic conversational talking cadence, candid facial micro-expressions, and natural lip sync.',
  },
  {
    label: 'Corporate Product Review',
    bangla: 'পণ্য রিভিউ ও প্রেজেন্টেশন',
    prompt:
      'Strictly maintain the exact person, clothing, and background from reference image without alteration. Animate confident presenter speech delivery, engaging smile, subtle head motion, and realistic mouth synchronization.',
  },
];

export const SUPPORTED_MODELS = [
  {
    id: 'heygen/heygen-video/reference-to-video',
    name: 'HeyGen Video (Reference-to-Video)',
    badge: 'Recommended · Gold Standard',
    costPerSec768p: 0.02,
    costPerSec1080p: 0.06,
    description: 'Best-in-class character preservation, lip-sync, and facial emotion for business and news presenters.',
  },
  {
    id: 'minimax/h3-max-turbo/image-to-video',
    name: 'MiniMax H3 Max Turbo',
    badge: 'Fast & Cinematic',
    costPerSec768p: 0.026,
    costPerSec1080p: 0.052,
    description: 'High-speed cinematic motion and lighting dynamics with rich physical simulation.',
  },
  {
    id: 'bytedance/seedance-2.5/us/reference-to-video',
    name: 'ByteDance Seedance 2.5',
    badge: 'Multi-Reference Pro',
    costPerSec768p: 0.5676,
    costPerSec1080p: 1.396,
    description: 'Supports up to 30 images and 10 audio references for deep complex scene composition.',
  },
];
