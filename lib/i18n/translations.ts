// SwachhLens translations — English / Hindi / Odia.
//
// Keys are namespaced by screen ("citizenHome.reportNow") so it's obvious
// where a string is used. Add new screens by adding another `ns(...)` block
// below and spreading it into `translations`. See contexts/language-context.tsx
// for the `t()` lookup + {var} interpolation this powers.

export type Language = 'en' | 'hi' | 'or';

export const LANGUAGES: { code: Language; nativeName: string; englishName: string }[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'hi', nativeName: 'हिंदी', englishName: 'Hindi' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia' },
];

type Entry = { en: string; hi: string; or: string };

function ns(prefix: string, entries: Record<string, Entry>): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  for (const key of Object.keys(entries)) {
    out[`${prefix}.${key}`] = entries[key];
  }
  return out;
}

const common = ns('common', {
  loading: { en: 'Loading...', hi: 'लोड हो रहा है...', or: 'ଲୋଡ୍ ହେଉଛି...' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', or: 'ବାତିଲ୍' },
  save: { en: 'Save', hi: 'सहेजें', or: 'ସେଭ୍ କରନ୍ତୁ' },
  ok: { en: 'OK', hi: 'ठीक है', or: 'ଠିକ୍ ଅଛି' },
  retry: { en: 'Retry', hi: 'पुनः प्रयास करें', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ' },
  pleaseTryAgain: { en: 'Please try again.', hi: 'कृपया पुनः प्रयास करें।', or: 'ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' },
  setYourLocation: { en: 'Set your location', hi: 'अपना स्थान सेट करें', or: 'ଆପଣଙ୍କ ଅବସ୍ଥାନ ସେଟ୍ କରନ୍ତୁ' },
  detectingLocation: {
    en: 'Detecting location...',
    hi: 'स्थान का पता लगाया जा रहा है...',
    or: 'ଅବସ୍ଥାନ ଚିହ୍ନଟ ହେଉଛି...',
  },
  viewAll: { en: 'View All', hi: 'सभी देखें', or: 'ସବୁ ଦେଖନ୍ତୁ' },
  viewMap: { en: 'View Map', hi: 'मानचित्र देखें', or: 'ମାନଚିତ୍ର ଦେଖନ୍ତୁ' },
  takePhoto: { en: 'Take Photo', hi: 'फोटो लें', or: 'ଫଟୋ ନିଅନ୍ତୁ' },
  chooseFromGallery: { en: 'Choose from Gallery', hi: 'गैलरी से चुनें', or: 'ଗ୍ୟାଲେରୀରୁ ବାଛନ୍ତୁ' },
  changeProfilePhoto: { en: 'Change Profile Photo', hi: 'प्रोफ़ाइल फ़ोटो बदलें', or: 'ପ୍ରୋଫାଇଲ୍ ଫଟୋ ବଦଳାନ୍ତୁ' },
  permissionNeeded: { en: 'Permission needed', hi: 'अनुमति आवश्यक है', or: 'ଅନୁମତି ଆବଶ୍ୟକ' },
  allowPhotoAccess: {
    en: 'Allow access to update your profile photo.',
    hi: 'अपनी प्रोफ़ाइल फ़ोटो अपडेट करने के लिए एक्सेस की अनुमति दें।',
    or: 'ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ଫଟୋ ଅପଡେଟ୍ କରିବାକୁ ପ୍ରବେଶକୁ ଅନୁମତି ଦିଅନ୍ତୁ।',
  },
  couldNotSaveName: { en: 'Could not save name', hi: 'नाम सहेजा नहीं जा सका', or: 'ନାମ ସେଭ୍ ହୋଇପାରିଲା ନାହିଁ' },
  couldNotUpdatePhoto: {
    en: 'Could not update photo',
    hi: 'फ़ोटो अपडेट नहीं हो सकी',
    or: 'ଫଟୋ ଅପଡେଟ୍ ହୋଇପାରିଲା ନାହିଁ',
  },
  logout: { en: 'Logout', hi: 'लॉगआउट', or: 'ଲଗଆଉଟ୍' },
  logoutConfirmBody: {
    en: 'Are you sure you want to logout?',
    hi: 'क्या आप वाकई लॉगआउट करना चाहते हैं?',
    or: 'ଆପଣ ନିଶ୍ଚିତ କି ଆପଣ ଲଗଆଉଟ୍ କରିବାକୁ ଚାହାଁନ୍ତି?',
  },
  kg: { en: 'kg', hi: 'किग्रा', or: 'କିଲୋଗ୍ରାମ' },
  notifications: { en: 'Notifications', hi: 'सूचनाएं', or: 'ବିଜ୍ଞପ୍ତି' },
  markAllRead: { en: 'Mark all read', hi: 'सभी पढ़ी हुई चिह्नित करें', or: 'ସବୁ ପଢ଼ାଯାଇଛି ଚିହ୍ନିତ କରନ୍ତୁ' },
  noNotificationsYet: { en: 'No notifications yet.', hi: 'अभी कोई सूचना नहीं।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିଜ୍ଞପ୍ତି ନାହିଁ।' },
  notFieldTeamAccount: {
    en: "This login isn't a field team account.",
    hi: 'यह लॉगिन फील्ड टीम खाता नहीं है।',
    or: 'ଏହି ଲଗଇନ୍ ଏକ ଫିଲ୍ଡ ଟିମ୍ ଆକାଉଣ୍ଟ ନୁହେଁ।',
  },
  backToLogin: { en: 'Back to Login', hi: 'लॉगिन पर वापस जाएं', or: 'ଲଗଇନ୍ କୁ ଫେରନ୍ତୁ' },
  today: { en: 'Today', hi: 'आज', or: 'ଆଜି' },
  thisWeek: { en: 'This Week', hi: 'इस सप्ताह', or: 'ଏହି ସପ୍ତାହ' },
  thisMonth: { en: 'This Month', hi: 'इस महीने', or: 'ଏହି ମାସ' },
  allPriorities: { en: 'All Priorities', hi: 'सभी प्राथमिकताएं', or: 'ସବୁ ପ୍ରାଥମିକତା' },
  highPriorityOnly: { en: 'High Priority Only', hi: 'केवल उच्च प्राथमिकता', or: 'କେବଳ ଉଚ୍ଚ ପ୍ରାଥମିକତା' },
  filterByPriority: {
    en: 'Filter by Priority',
    hi: 'प्राथमिकता के अनुसार फ़िल्टर करें',
    or: 'ପ୍ରାଥମିକତା ଅନୁସାରେ ଫିଲ୍ଟର କରନ୍ତୁ',
  },
  selectPeriod: { en: 'Select Period', hi: 'अवधि चुनें', or: 'ଅବଧି ବାଛନ୍ତୁ' },
  greetingMorning: { en: 'Good Morning', hi: 'सुप्रभात', or: 'ଶୁଭ ସକାଳ' },
  greetingAfternoon: { en: 'Good Afternoon', hi: 'नमस्कार', or: 'ଶୁଭ ଅପରାହ୍ନ' },
  greetingEvening: { en: 'Good Evening', hi: 'शुभ संध्या', or: 'ଶୁଭ ସନ୍ଧ୍ୟା' },
  language: { en: 'Language', hi: 'भाषा', or: 'ଭାଷା' },
  changeLanguage: { en: 'Change Language', hi: 'भाषा बदलें', or: 'ଭାଷା ବଦଳାନ୍ତୁ' },
});

const languageSelect = ns('languageSelect', {
  title: { en: 'Welcome!', hi: 'स्वागत है!', or: 'ସ୍ୱାଗତ!' },
  subtitle: {
    en: 'Please choose your preferred language to continue',
    hi: 'जारी रखने के लिए कृपया अपनी पसंदीदा भाषा चुनें',
    or: 'ଜାରି ରଖିବାକୁ ଦୟାକରି ଆପଣଙ୍କର ପସନ୍ଦିତ ଭାଷା ବାଛନ୍ତୁ',
  },
  englishTitle: { en: 'English', hi: 'English', or: 'English' },
  englishSubtitle: { en: 'Continue in English', hi: 'Continue in English', or: 'Continue in English' },
  hindiTitle: { en: 'Hindi', hi: 'Hindi', or: 'Hindi' },
  hindiSubtitle: { en: 'हिंदी में जारी रखें', hi: 'हिंदी में जारी रखें', or: 'हिंदी में जारी रखें' },
  odiaTitle: { en: 'Odia', hi: 'Odia', or: 'Odia' },
  odiaSubtitle: {
    en: 'ଓଡ଼ିଆରେ ଜାରି ରଖନ୍ତୁ',
    hi: 'ଓଡ଼ିଆରେ ଜାରି ରଖନ୍ତୁ',
    or: 'ଓଡ଼ିଆରେ ଜାରି ରଖନ୍ତୁ',
  },
  footerLine1: { en: 'Cleaner Cities.', hi: 'स्वच्छ शहर।', or: 'ପରିଷ୍କାର ସହର।' },
  footerLine2: { en: 'Smarter Future.', hi: 'स्मार्ट भविष्य।', or: 'ସ୍ମାର୍ଟ ଭବିଷ୍ୟତ।' },
  appTagline: {
    en: 'AI-Powered Waste Management',
    hi: 'AI-संचालित कचरा प्रबंधन',
    or: 'AI-ଚାଳିତ ଆବର୍ଜନା ପରିଚାଳନା',
  },
});

const citizenTabs = ns('citizenTabs', {
  home: { en: 'Home', hi: 'होम', or: 'ହୋମ' },
  report: { en: 'Report', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  myReports: { en: 'My Reports', hi: 'मेरी रिपोर्ट', or: 'ମୋର ରିପୋର୍ଟ' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल', or: 'ପ୍ରୋଫାଇଲ୍' },
});

const fieldTabs = ns('fieldTabs', {
  home: { en: 'Home', hi: 'होम', or: 'ହୋମ' },
  tasks: { en: 'Tasks', hi: 'कार्य', or: 'କାର୍ଯ୍ୟ' },
  map: { en: 'Map', hi: 'मानचित्र', or: 'ମାନଚିତ୍ର' },
  reports: { en: 'Reports', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल', or: 'ପ୍ରୋଫାଇଲ୍' },
});

const citizenHome = ns('citizenHome', {
  reportCardTitle: {
    en: 'Report a Waste Issue',
    hi: 'कचरे की समस्या की रिपोर्ट करें',
    or: 'ଆବର୍ଜନା ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ',
  },
  reportCardSubtitle1: {
    en: 'Found unwanted, overflowed or misplaced waste?',
    hi: 'अवांछित, बहता हुआ या गलत जगह पड़ा कचरा मिला?',
    or: 'ଅବାଞ୍ଛିତ, ଉଛୁଳିଥିବା କିମ୍ବା ଭୁଲ ସ୍ଥାନରେ ଥିବା ଆବର୍ଜନା ମିଳିଲା କି?',
  },
  reportCardSubtitle2: {
    en: 'Take a photo and let AI analyze it.',
    hi: 'फोटो लें और AI को इसका विश्लेषण करने दें।',
    or: 'ଏକ ଫଟୋ ନିଅନ୍ତୁ ଏବଂ AI କୁ ଏହାର ବିଶ୍ଳେଷଣ କରିବାକୁ ଦିଅନ୍ତୁ।',
  },
  reportNow: { en: 'Report Now', hi: 'अभी रिपोर्ट करें', or: 'ବର୍ତ୍ତମାନ ରିପୋର୍ଟ କରନ୍ତୁ' },
  aiPowered: { en: 'AI Powered', hi: 'AI संचालित', or: 'AI ଚାଳିତ' },
  aiDetectWasteType: {
    en: 'Detect Waste\nType',
    hi: 'कचरे का\nप्रकार पहचानें',
    or: 'ଆବର୍ଜନା\nପ୍ରକାର ଚିହ୍ନଟ',
  },
  aiEstimateVolume: { en: 'Estimate\nVolume', hi: 'मात्रा का\nअनुमान लगाएं', or: 'ପରିମାଣ\nଆକଳନ' },
  aiCheckSeverity: { en: 'Check\nSeverity', hi: 'गंभीरता\nजांचें', or: 'ଗମ୍ଭୀରତା\nଯାଞ୍ଚ' },
  aiFindDuplicates: { en: 'Find\nDuplicates', hi: 'डुप्लिकेट\nखोजें', or: 'ନକଲ\nଖୋଜନ୍ତୁ' },
  yourActiveReport: {
    en: 'Your Active Report',
    hi: 'आपकी सक्रिय रिपोर्ट',
    or: 'ଆପଣଙ୍କର ସକ୍ରିୟ ରିପୋର୍ଟ',
  },
  noReportsYet: {
    en: 'No reports yet. Tap Report Now to submit your first one.',
    hi: 'अभी तक कोई रिपोर्ट नहीं। अपनी पहली रिपोर्ट सबमिट करने के लिए "अभी रिपोर्ट करें" पर टैप करें।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ରିପୋର୍ଟ ନାହିଁ। ଆପଣଙ୍କର ପ୍ରଥମ ରିପୋର୍ଟ ଦାଖଲ କରିବାକୁ "ବର୍ତ୍ତମାନ ରିପୋର୍ଟ କରନ୍ତୁ" ଟିପନ୍ତୁ।',
  },
  reportedAgo: {
    en: 'Reported {time}',
    hi: '{time} पहले रिपोर्ट की गई',
    or: '{time} ପୂର୍ବେ ରିପୋର୍ଟ ହୋଇଛି',
  },
  trackStatus: { en: 'Track Status', hi: 'स्थिति ट्रैक करें', or: 'ସ୍ଥିତି ଟ୍ରାକ୍ କରନ୍ତୁ' },
  wasteHotspotsNearYou: {
    en: 'Waste Hotspots Near You',
    hi: 'आपके पास कचरा हॉटस्पॉट',
    or: 'ଆପଣଙ୍କ ନିକଟରେ ଆବର୍ଜନା ହଟସ୍ପଟ',
  },
  garbageDump: { en: 'Garbage Dump', hi: 'कचरा डंप', or: 'ଆବର୍ଜନା ଡମ୍ପ' },
  overflowingBin: { en: 'Overflowing Bin', hi: 'भरा हुआ कूड़ेदान', or: 'ଉଛୁଳୁଥିବା ଡଷ୍ଟବିନ୍' },
  kmAway: { en: '{km} km away', hi: '{km} किमी दूर', or: '{km} କିମି ଦୂର' },
  yourImpact: { en: 'Your Impact', hi: 'आपका प्रभाव', or: 'ଆପଣଙ୍କ ପ୍ରଭାବ' },
  reportsSubmitted: {
    en: 'Reports\nSubmitted',
    hi: 'प्रस्तुत\nरिपोर्ट',
    or: 'ଦାଖଲ ହୋଇଥିବା\nରିପୋର୍ଟ',
  },
  reportsResolved: {
    en: 'Reports\nResolved',
    hi: 'सुलझाई गई\nरिपोर्ट',
    or: 'ସମାଧାନ ହୋଇଥିବା\nରିପୋର୍ଟ',
  },
  wasteRemoved: { en: 'Waste\nRemoved', hi: 'हटाया गया\nकचरा', or: 'ହଟାଯାଇଥିବା\nଆବର୍ଜନା' },
});

const myReports = ns('myReports', {
  headerTitle: {
    en: 'Your Active Reports',
    hi: 'आपकी सक्रिय रिपोर्ट',
    or: 'ଆପଣଙ୍କର ସକ୍ରିୟ ରିପୋର୍ଟ',
  },
  filterAll: { en: 'All', hi: 'सभी', or: 'ସବୁ' },
  filterActive: { en: 'Active', hi: 'सक्रिय', or: 'ସକ୍ରିୟ' },
  filterResolved: { en: 'Resolved', hi: 'सुलझाया गया', or: 'ସମାଧାନ ହୋଇଛି' },
  noReportsHere: {
    en: 'No reports here yet.',
    hi: 'यहाँ अभी तक कोई रिपोर्ट नहीं है।',
    or: 'ଏଠାରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ରିପୋର୍ଟ ନାହିଁ।',
  },
});

const report = ns('report', {
  defaultTitle: { en: 'Report Waste', hi: 'कचरा रिपोर्ट करें', or: 'ଆବର୍ଜନା ରିପୋର୍ଟ କରନ୍ତୁ' },
  defaultQuestion: {
    en: 'What did you want to report?',
    hi: 'आप क्या रिपोर्ट करना चाहते थे?',
    or: 'ଆପଣ କଣ ରିପୋର୍ଟ କରିବାକୁ ଚାହୁଁଥିଲେ?',
  },
  detectTitle: { en: 'Detect Waste Type', hi: 'कचरे का प्रकार पहचानें', or: 'ଆବର୍ଜନା ପ୍ରକାର ଚିହ୍ନଟ କରନ୍ତୁ' },
  detectQuestion: {
    en: 'Capture the waste so AI can detect its type',
    hi: 'कचरे की तस्वीर लें ताकि AI उसका प्रकार पहचान सके',
    or: 'AI ଏହାର ପ୍ରକାର ଚିହ୍ନଟ କରିପାରିବା ପାଇଁ ଆବର୍ଜନାର ଫଟୋ ନିଅନ୍ତୁ',
  },
  detectDescription: {
    en: "We'll identify what kind of waste this is.",
    hi: 'हम पहचानेंगे कि यह किस प्रकार का कचरा है।',
    or: 'ଏହା କେଉଁ ପ୍ରକାରର ଆବର୍ଜନା ତାହା ଆମେ ଚିହ୍ନଟ କରିବୁ।',
  },
  volumeTitle: { en: 'Estimate Volume', hi: 'मात्रा का अनुमान लगाएं', or: 'ପରିମାଣ ଆକଳନ କରନ୍ତୁ' },
  volumeQuestion: {
    en: 'Capture the waste so AI can estimate its volume',
    hi: 'कचरे की तस्वीर लें ताकि AI उसकी मात्रा का अनुमान लगा सके',
    or: 'AI ଏହାର ପରିମାଣ ଆକଳନ କରିପାରିବା ପାଇଁ ଆବର୍ଜନାର ଫଟୋ ନିଅନ୍ତୁ',
  },
  volumeDescription: {
    en: "We'll estimate how much waste is present.",
    hi: 'हम अनुमान लगाएंगे कि कितना कचरा मौजूद है।',
    or: 'କେତେ ଆବର୍ଜନା ଅଛି ତାହା ଆମେ ଆକଳନ କରିବୁ।',
  },
  severityTitle: { en: 'Check Severity', hi: 'गंभीरता जांचें', or: 'ଗମ୍ଭୀରତା ଯାଞ୍ଚ କରନ୍ତୁ' },
  severityQuestion: {
    en: 'Capture the waste so AI can check its severity',
    hi: 'कचरे की तस्वीर लें ताकि AI उसकी गंभीरता जांच सके',
    or: 'AI ଏହାର ଗମ୍ଭୀରତା ଯାଞ୍ଚ କରିପାରିବା ପାଇଁ ଆବର୍ଜନାର ଫଟୋ ନିଅନ୍ତୁ',
  },
  severityDescription: {
    en: "We'll assess how urgent this issue is.",
    hi: 'हम आकलन करेंगे कि यह समस्या कितनी अत्यावश्यक है।',
    or: 'ଏହି ସମସ୍ୟା କେତେ ଜରୁରୀ ତାହା ଆମେ ମୂଲ୍ୟାଙ୍କନ କରିବୁ।',
  },
  duplicateTitle: { en: 'Find Duplicates', hi: 'डुप्लिकेट खोजें', or: 'ନକଲ ଖୋଜନ୍ତୁ' },
  duplicateQuestion: {
    en: 'Capture the waste so AI can check for duplicates',
    hi: 'कचरे की तस्वीर लें ताकि AI डुप्लिकेट जांच सके',
    or: 'AI ନକଲ ପାଇଁ ଯାଞ୍ଚ କରିପାରିବା ପାଇଁ ଆବର୍ଜନାର ଫଟୋ ନିଅନ୍ତୁ',
  },
  duplicateDescription: {
    en: "We'll check if this has already been reported nearby.",
    hi: 'हम जांचेंगे कि क्या यह पहले से आस-पास रिपोर्ट किया जा चुका है।',
    or: 'ଏହା ପୂର୍ବରୁ ନିକଟରେ ରିପୋର୍ଟ ହୋଇଛି କି ନାହିଁ ଆମେ ଯାଞ୍ଚ କରିବୁ।',
  },
  optionPhotoTitle: { en: 'Take Photo', hi: 'फोटो लें', or: 'ଫଟୋ ନିଅନ୍ତୁ' },
  optionPhotoSubtitle: { en: 'Capture waste image', hi: 'कचरे की तस्वीर लें', or: 'ଆବର୍ଜନାର ଫଟୋ ନିଅନ୍ତୁ' },
  optionVideoTitle: { en: 'Record Video', hi: 'वीडियो रिकॉर्ड करें', or: 'ଭିଡିଓ ରେକର୍ଡ କରନ୍ତୁ' },
  optionVideoSubtitle: {
    en: 'Record a short video',
    hi: 'एक छोटा वीडियो रिकॉर्ड करें',
    or: 'ଏକ ଛୋଟ ଭିଡିଓ ରେକର୍ଡ କରନ୍ତୁ',
  },
  optionGalleryTitle: { en: 'Choose from Gallery', hi: 'गैलरी से चुनें', or: 'ଗ୍ୟାଲେରୀରୁ ବାଛନ୍ତୁ' },
  optionGallerySubtitle: {
    en: 'Upload from gallery',
    hi: 'गैलरी से अपलोड करें',
    or: 'ଗ୍ୟାଲେରୀରୁ ଅପଲୋଡ୍ କରନ୍ତୁ',
  },
  tipsHeading: { en: 'Tips', hi: 'सुझाव', or: 'ପରାମର୍ଶ' },
  tip1: { en: 'Capture clear images', hi: 'स्पष्ट तस्वीरें लें', or: 'ସ୍ପଷ୍ଟ ଛବି ନିଅନ୍ତୁ' },
  tip2: {
    en: 'Include the waste area',
    hi: 'कचरे वाले क्षेत्र को शामिल करें',
    or: 'ଆବର୍ଜନା ଅଞ୍ଚଳକୁ ଅନ୍ତର୍ଭୁକ୍ତ କରନ୍ତୁ',
  },
  tip3: { en: 'Ensure good lighting', hi: 'अच्छी रोशनी सुनिश्चित करें', or: 'ଭଲ ଆଲୋକ ନିଶ୍ଚିତ କରନ୍ତୁ' },
  cameraAccessNeeded: {
    en: 'Camera access needed',
    hi: 'कैमरा एक्सेस आवश्यक है',
    or: 'କ୍ୟାମେରା ପ୍ରବେଶ ଆବଶ୍ୟକ',
  },
  allowCameraPhoto: {
    en: 'Allow camera access to take a photo of the waste.',
    hi: 'कचरे की फोटो लेने के लिए कैमरा एक्सेस की अनुमति दें।',
    or: 'ଆବର୍ଜନାର ଫଟୋ ନେବା ପାଇଁ କ୍ୟାମେରା ପ୍ରବେଶକୁ ଅନୁମତି ଦିଅନ୍ତୁ।',
  },
  allowCameraVideo: {
    en: 'Allow camera access to record a video of the waste.',
    hi: 'कचरे का वीडियो रिकॉर्ड करने के लिए कैमरा एक्सेस की अनुमति दें।',
    or: 'ଆବର୍ଜନାର ଭିଡିଓ ରେକର୍ଡ କରିବା ପାଇଁ କ୍ୟାମେରା ପ୍ରବେଶକୁ ଅନୁମତି ଦିଅନ୍ତୁ।',
  },
  photosAccessNeeded: {
    en: 'Photos access needed',
    hi: 'फ़ोटो एक्सेस आवश्यक है',
    or: 'ଫଟୋ ପ୍ରବେଶ ଆବଶ୍ୟକ',
  },
  allowPhotoLibrary: {
    en: 'Allow photo library access to choose media.',
    hi: 'मीडिया चुनने के लिए फोटो लाइब्रेरी एक्सेस की अनुमति दें।',
    or: 'ମିଡିଆ ବାଛିବା ପାଇଁ ଫଟୋ ଲାଇବ୍ରେରୀ ପ୍ରବେଶକୁ ଅନୁମତି ଦିଅନ୍ତୁ।',
  },
});

const citizenProfile = ns('citizenProfile', {
  personalInformation: {
    en: 'Personal Information',
    hi: 'व्यक्तिगत जानकारी',
    or: 'ବ୍ୟକ୍ତିଗତ ସୂଚନା',
  },
  savedLocations: { en: 'Saved Locations', hi: 'सहेजे गए स्थान', or: 'ସେଭ୍ ହୋଇଥିବା ସ୍ଥାନ' },
  notificationsMenu: { en: 'Notifications', hi: 'सूचनाएं', or: 'ବିଜ୍ଞପ୍ତି' },
  reports: { en: 'Reports', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  resolved: { en: 'Resolved', hi: 'सुलझाया गया', or: 'ସମାଧାନ ହୋଇଛି' },
  wasteRemoved: { en: 'Waste Removed', hi: 'हटाया गया कचरा', or: 'ହଟାଯାଇଥିବା ଆବର୍ଜନା' },
  yourName: { en: 'Your name', hi: 'आपका नाम', or: 'ଆପଣଙ୍କ ନାମ' },
});

const fieldHome = ns('fieldHome', {
  assignedToday: { en: 'Assigned\nToday', hi: 'आज\nसौंपे गए', or: 'ଆଜି\nନ୍ୟସ୍ତ' },
  completed: { en: 'Completed', hi: 'पूर्ण', or: 'ସମାପ୍ତ' },
  inProgress: { en: 'In\nProgress', hi: 'प्रगति\nमें', or: 'ଚାଲୁଅଛି' },
  pending: { en: 'Pending', hi: 'लंबित', or: 'ବିଚାରାଧୀନ' },
  todaysOverview: { en: "Today's Overview", hi: 'आज का अवलोकन', or: 'ଆଜିର ସମୀକ୍ଷା' },
  urgentNow: { en: 'Urgent Now', hi: 'अभी अत्यावश्यक', or: 'ବର୍ତ୍ତମାନ ଜରୁରୀ' },
  avgResponse: { en: 'Avg. Response', hi: 'औसत प्रतिक्रिया', or: 'ହାରାହାରି ପ୍ରତିକ୍ରିୟା' },
  nextTaskLabel: { en: 'Next Task', hi: 'अगला कार्य', or: 'ପରବର୍ତ୍ତୀ କାର୍ଯ୍ୟ' },
  noTasksAssigned: {
    en: 'No tasks assigned yet. New tasks from the admin will show up here instantly.',
    hi: 'अभी तक कोई कार्य नहीं सौंपा गया। एडमिन से नए कार्य यहां तुरंत दिखाई देंगे।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କାର୍ଯ୍ୟ ନ୍ୟସ୍ତ ହୋଇନାହିଁ। ଆଡମିନଙ୍କଠାରୁ ନୂଆ କାର୍ଯ୍ୟ ଏଠାରେ ତୁରନ୍ତ ଦେଖାଯିବ।',
  },
  yourNextTask: { en: 'Your Next Task', hi: 'आपका अगला कार्य', or: 'ଆପଣଙ୍କର ପରବର୍ତ୍ତୀ କାର୍ଯ୍ୟ' },
  startTask: { en: 'Start Task', hi: 'कार्य शुरू करें', or: 'କାର୍ଯ୍ୟ ଆରମ୍ଭ କରନ୍ତୁ' },
  continueOnTheWay: {
    en: 'Continue: On the Way',
    hi: 'जारी रखें: रास्ते में',
    or: 'ଜାରି ରଖନ୍ତୁ: ରାସ୍ତାରେ',
  },
  continueUploadProgress: {
    en: 'Continue: Upload Progress',
    hi: 'जारी रखें: प्रगति अपलोड करें',
    or: 'ଜାରି ରଖନ୍ତୁ: ପ୍ରଗତି ଅପଲୋଡ୍',
  },
  assignedAgo: { en: 'Assigned {time}', hi: '{time} पहले सौंपा गया', or: '{time} ପୂର୍ବେ ନ୍ୟସ୍ତ' },
  recentAssignments: { en: 'Recent Assignments', hi: 'हाल के कार्य', or: 'ସାମ୍ପ୍ରତିକ ନ୍ୟସ୍ତ' },
  allAssignments: { en: 'All Assignments', hi: 'सभी कार्य', or: 'ସବୁ ନ୍ୟସ୍ତ' },
  priority: { en: '{label} Priority', hi: '{label} प्राथमिकता', or: '{label} ପ୍ରାଥମିକତା' },
});

const fieldTasks = ns('fieldTasks', {
  headerTitle: { en: 'My Tasks', hi: 'मेरे कार्य', or: 'ମୋର କାର୍ଯ୍ୟ' },
  tabAll: { en: 'All', hi: 'सभी', or: 'ସବୁ' },
  tabInProgress: { en: 'In Progress', hi: 'प्रगति में', or: 'ଚାଲୁଅଛି' },
  tabCompleted: { en: 'Completed', hi: 'पूर्ण', or: 'ସମାପ୍ତ' },
  nothingHereYet: { en: 'Nothing here yet.', hi: 'यहां अभी कुछ नहीं है।', or: 'ଏଠାରେ ବର୍ତ୍ତମାନ କିଛି ନାହିଁ।' },
});

const fieldReports = ns('fieldReports', {
  headerTitle: { en: 'Reports', hi: 'रिपोर्ट', or: 'ରିପୋର୍ଟ' },
  headerSubtitle: {
    en: 'Track performance and impact',
    hi: 'प्रदर्शन और प्रभाव को ट्रैक करें',
    or: 'କାର୍ଯ୍ୟଦକ୍ଷତା ଏବଂ ପ୍ରଭାବ ଟ୍ରାକ୍ କରନ୍ତୁ',
  },
  tasksCompleted: { en: 'Tasks Completed', hi: 'पूर्ण कार्य', or: 'ସମାପ୍ତ କାର୍ଯ୍ୟ' },
  tonsCollected: { en: 'Tons Collected', hi: 'एकत्रित टन', or: 'ସଂଗ୍ରହ ହୋଇଥିବା ଟନ୍' },
  avgResponseTime: {
    en: 'Avg. Response Time',
    hi: 'औसत प्रतिक्रिया समय',
    or: 'ହାରାହାରି ପ୍ରତିକ୍ରିୟା ସମୟ',
  },
  urgentCompleted: { en: 'Urgent Completed', hi: 'पूर्ण अत्यावश्यक', or: 'ସମାପ୍ତ ଜରୁରୀ' },
  tasksTrend: { en: 'Tasks Trend', hi: 'कार्य रुझान', or: 'କାର୍ଯ୍ୟ ଧାରା' },
  noCompletedTasksPeriod: {
    en: 'No completed tasks in this period yet.',
    hi: 'इस अवधि में अभी कोई कार्य पूर्ण नहीं हुआ।',
    or: 'ଏହି ଅବଧିରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କାର୍ଯ୍ୟ ସମାପ୍ତ ହୋଇନାହିଁ।',
  },
  wasteBreakdown: { en: 'Waste Breakdown', hi: 'कचरा विश्लेषण', or: 'ଆବର୍ଜନା ବିଭାଜନ' },
  recentActivity: { en: 'Recent Activity', hi: 'हाल की गतिविधि', or: 'ସାମ୍ପ୍ରତିକ କାର୍ଯ୍ୟକଳାପ' },
  noTasksYet: { en: 'No tasks yet.', hi: 'अभी कोई कार्य नहीं।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କାର୍ଯ୍ୟ ନାହିଁ।' },
  noData: { en: 'No data', hi: 'कोई डेटा नहीं', or: 'କୌଣସି ତଥ୍ୟ ନାହିଁ' },
});

const fieldMap = ns('fieldMap', {
  headerTitle: { en: 'Map', hi: 'मानचित्र', or: 'ମାନଚିତ୍ର' },
  listView: { en: 'List View', hi: 'सूची दृश्य', or: 'ତାଲିକା ଦୃଶ୍ୟ' },
  allTasks: { en: 'All Tasks', hi: 'सभी कार्य', or: 'ସବୁ କାର୍ଯ୍ୟ' },
  myLocation: { en: 'My Location', hi: 'मेरा स्थान', or: 'ମୋର ଅବସ୍ଥାନ' },
  filter: { en: 'Filter', hi: 'फ़िल्टर', or: 'ଫିଲ୍ଟର' },
  recenter: { en: 'Re-center', hi: 'फिर से केंद्रित करें', or: 'ପୁନଃକେନ୍ଦ୍ରୀକରଣ' },
  navigate: { en: 'Navigate', hi: 'नेविगेट करें', or: 'ନାଭିଗେଟ୍ କରନ୍ତୁ' },
  eta: { en: 'ETA: {eta}', hi: 'अनुमानित समय: {eta}', or: 'ETA: {eta}' },
  legendHighPriority: { en: 'High Priority', hi: 'उच्च प्राथमिकता', or: 'ଉଚ୍ଚ ପ୍ରାଥମିକତା' },
  legendPending: { en: 'Pending', hi: 'लंबित', or: 'ବିଚାରାଧୀନ' },
  legendInProgress: { en: 'In Progress', hi: 'प्रगति में', or: 'ଚାଲୁଅଛି' },
  legendCompleted: { en: 'Completed', hi: 'पूर्ण', or: 'ସମାପ୍ତ' },
  couldNotGetRoute: { en: 'Could not get a route', hi: 'मार्ग प्राप्त नहीं हो सका', or: 'ମାର୍ଗ ମିଳିଲା ନାହିଁ' },
  routingUnavailable: {
    en: 'The routing service is unavailable right now — try again shortly.',
    hi: 'रूटिंग सेवा अभी उपलब्ध नहीं है — कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    or: 'ମାର୍ଗ ସେବା ବର୍ତ୍ତମାନ ଉପଲବ୍ଧ ନାହିଁ — ଟିକିଏ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
});

const fieldProfile = ns('fieldProfile', {
  headerTitle: { en: 'Profile', hi: 'प्रोफ़ाइल', or: 'ପ୍ରୋଫାଇଲ୍' },
  fieldTeamMember: { en: 'Field Team Member', hi: 'फील्ड टीम सदस्य', or: 'ଫିଲ୍ଡ ଟିମ୍ ସଦସ୍ୟ' },
  tasksCompleted: { en: 'Tasks Completed', hi: 'पूर्ण कार्य', or: 'ସମାପ୍ତ କାର୍ଯ୍ୟ' },
  completionRate: { en: 'Completion Rate', hi: 'पूर्णता दर', or: 'ସମାପ୍ତି ହାର' },
  rating: { en: 'Rating', hi: 'रेटिंग', or: 'ରେଟିଂ' },
  daysActive: { en: 'Days Active', hi: 'सक्रिय दिन', or: 'ସକ୍ରିୟ ଦିନ' },
  basicInformation: { en: 'Basic Information', hi: 'बुनियादी जानकारी', or: 'ମୌଳିକ ସୂଚନା' },
  fullName: { en: 'Full Name', hi: 'पूरा नाम', or: 'ପୂର୍ଣ୍ଣ ନାମ' },
  emailAddress: { en: 'Email Address', hi: 'ईमेल पता', or: 'ଇମେଲ୍ ଠିକଣା' },
  team: { en: 'Team', hi: 'टीम', or: 'ଟିମ୍' },
  joinedOn: { en: 'Joined On', hi: 'शामिल होने की तिथि', or: 'ଯୋଗଦାନ ତାରିଖ' },
  moreOptions: { en: 'More Options', hi: 'अधिक विकल्प', or: 'ଅଧିକ ବିକଳ୍ପ' },
  aboutApp: { en: 'About SwachhLens', hi: 'SwachhLens के बारे में', or: 'SwachhLens ବିଷୟରେ' },
  aboutAppBody: {
    en: 'SwachhLens helps field cleanup teams track, start, and submit waste-management tasks in real time, and lets citizens report waste issues and follow their cleanup status.',
    hi: 'SwachhLens फील्ड सफाई टीमों को वास्तविक समय में कचरा-प्रबंधन कार्यों को ट्रैक करने, शुरू करने और सबमिट करने में मदद करता है, और नागरिकों को कचरे की समस्याओं की रिपोर्ट करने और उनकी सफाई स्थिति का पालन करने देता है।',
    or: 'SwachhLens ଫିଲ୍ଡ ସଫେଇ ଦଳଙ୍କୁ ପ୍ରକୃତ ସମୟରେ ଆବର୍ଜନା-ପରିଚାଳନା କାର୍ଯ୍ୟ ଟ୍ରାକ୍, ଆରମ୍ଭ ଏବଂ ଦାଖଲ କରିବାରେ ସାହାଯ୍ୟ କରେ, ଏବଂ ନାଗରିକମାନଙ୍କୁ ଆବର୍ଜନା ସମସ୍ୟା ରିପୋର୍ଟ କରିବାକୁ ଏବଂ ସେମାନଙ୍କର ସଫେଇ ସ୍ଥିତି ଅନୁସରଣ କରିବାକୁ ଦିଏ।',
  },
  settings: { en: 'Settings', hi: 'सेटिंग्स', or: 'ସେଟିଂସ୍' },
  editFullName: { en: 'Edit Full Name', hi: 'पूरा नाम संपादित करें', or: 'ପୂର୍ଣ୍ଣ ନାମ ସମ୍ପାଦନ କରନ୍ତୁ' },
  changePhoto: { en: 'Change Photo', hi: 'फ़ोटो बदलें', or: 'ଫଟୋ ବଦଳାନ୍ତୁ' },
});

// --- Enum/status labels — the underlying values stay fixed English tokens
// (stored in the DB, shared with the admin panel); these are display-only
// translations looked up by that raw token, e.g. t(`wasteCategory.${category}`).

const wasteCategory = ns('wasteCategory', {
  'Overflowing Bin': { en: 'Overflowing Bin', hi: 'अतिप्रवाहित कूड़ेदान', or: 'ଉଛୁଳୁଥିବା ଡଷ୍ଟବିନ୍' },
  'Garbage Dump': { en: 'Garbage Dump', hi: 'कचरा डंप', or: 'ଆବର୍ଜନା ଡମ୍ପ' },
  'Plastic Waste': { en: 'Plastic Waste', hi: 'प्लास्टिक कचरा', or: 'ପ୍ଲାଷ୍ଟିକ୍ ଆବର୍ଜନା' },
  'Construction Debris': { en: 'Construction Debris', hi: 'निर्माण मलबा', or: 'ନିର୍ମାଣ ମଲବା' },
  'Organic Waste': { en: 'Organic Waste', hi: 'जैविक कचरा', or: 'ଜୈବିକ ଆବର୍ଜନା' },
  'E-Waste': { en: 'E-Waste', hi: 'ई-कचरा', or: 'ଇ-ଆବର୍ଜନା' },
  'Hazardous Waste': { en: 'Hazardous Waste', hi: 'खतरनाक कचरा', or: 'ବିପଜ୍ଜନକ ଆବର୍ଜନା' },
  'Drain Blockage': { en: 'Drain Blockage', hi: 'नाली अवरोध', or: 'ନାଳ ଅବରୋଧ' },
});

const severityLevel = ns('severityLevel', {
  Low: { en: 'Low', hi: 'निम्न', or: 'ନିମ୍ନ' },
  Medium: { en: 'Medium', hi: 'मध्यम', or: 'ମଧ୍ୟମ' },
  High: { en: 'High', hi: 'उच्च', or: 'ଉଚ୍ଚ' },
  Critical: { en: 'Critical', hi: 'गंभीर', or: 'ଗମ୍ଭୀର' },
});

const priorityLevel = ns('priorityLevel', {
  Normal: { en: 'Normal', hi: 'सामान्य', or: 'ସାଧାରଣ' },
  High: { en: 'High', hi: 'उच्च', or: 'ଉଚ୍ଚ' },
  Urgent: { en: 'Urgent', hi: 'अत्यावश्यक', or: 'ଜରୁରୀ' },
});

const volumeSize = ns('volumeSize', {
  Small: { en: 'Small', hi: 'छोटा', or: 'ଛୋଟ' },
  Medium: { en: 'Medium', hi: 'मध्यम', or: 'ମଧ୍ୟମ' },
  Large: { en: 'Large', hi: 'बड़ा', or: 'ବଡ଼' },
  'Very Large': { en: 'Very Large', hi: 'बहुत बड़ा', or: 'ବହୁତ ବଡ଼' },
});

const reportStatus = ns('reportStatus', {
  submitted: { en: 'Submitted', hi: 'प्रस्तुत', or: 'ଦାଖଲ ହୋଇଛି' },
  team_assigned: { en: 'Team Assigned', hi: 'टीम नियुक्त', or: 'ଟିମ୍ ନ୍ୟସ୍ତ' },
  in_progress: { en: 'In Progress', hi: 'प्रगति में', or: 'ଚାଲୁଅଛି' },
  resolved: { en: 'Resolved', hi: 'सुलझाया गया', or: 'ସମାଧାନ ହୋଇଛି' },
});

const fieldTaskStatus = ns('fieldTaskStatus', {
  pending: { en: 'New', hi: 'नया', or: 'ନୂଆ' },
  on_the_way: { en: 'On the Way', hi: 'रास्ते में', or: 'ରାସ୍ତାରେ' },
  in_progress: { en: 'In Progress', hi: 'प्रगति में', or: 'ଚାଲୁଅଛି' },
  pending_review: { en: 'Pending Review', hi: 'समीक्षा लंबित', or: 'ସମୀକ୍ଷା ବିଚାରାଧୀନ' },
  completed: { en: 'Completed', hi: 'पूर्ण', or: 'ସମାପ୍ତ' },
});

const teamStatus = ns('teamStatus', {
  on_duty: { en: 'On Duty', hi: 'ड्यूटी पर', or: 'ଡ୍ୟୁଟିରେ' },
  available: { en: 'Available', hi: 'उपलब्ध', or: 'ଉପଲବ୍ଧ' },
  maintenance: { en: 'Maintenance', hi: 'रखरखाव', or: 'ରକ୍ଷଣାବେକ୍ଷଣ' },
});

const timeAgo = ns('timeAgo', {
  justNow: { en: 'Just now', hi: 'अभी अभी', or: 'ଏବେ' },
  minAgo: { en: '{n} min ago', hi: '{n} मिनट पहले', or: '{n} ମିନିଟ୍ ପୂର୍ବେ' },
  hrAgo: { en: '{n} hr ago', hi: '{n} घंटा पहले', or: '{n} ଘଣ୍ଟା ପୂର୍ବେ' },
  hrsAgo: { en: '{n} hrs ago', hi: '{n} घंटे पहले', or: '{n} ଘଣ୍ଟା ପୂର୍ବେ' },
  dayAgo: { en: '{n} day ago', hi: '{n} दिन पहले', or: '{n} ଦିନ ପୂର୍ବେ' },
  daysAgo: { en: '{n} days ago', hi: '{n} दिन पहले', or: '{n} ଦିନ ପୂର୍ବେ' },
  hAgoShort: { en: '{n}h ago', hi: '{n} घं पहले', or: '{n}ଘ ପୂର୍ବେ' },
  dAgoShort: { en: '{n}d ago', hi: '{n} दि पहले', or: '{n}ଦି ପୂର୍ବେ' },
});

const reportScan = ns('reportScan', {
  title: { en: 'AI Analyzing...', hi: 'AI विश्लेषण कर रहा है...', or: 'AI ବିଶ୍ଳେଷଣ କରୁଛି...' },
  subtitle: {
    en: 'Please wait while we analyze the waste',
    hi: 'कृपया प्रतीक्षा करें जब तक हम कचरे का विश्लेषण करते हैं',
    or: 'ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ ଯେତେବେଳେ ଆମେ ଆବର୍ଜନା ବିଶ୍ଳେଷଣ କରୁଛୁ',
  },
  stepValidate: {
    en: 'Validating photo...',
    hi: 'फोटो सत्यापित की जा रही है...',
    or: 'ଫଟୋ ବୈଧ କରାଯାଉଛି...',
  },
  stepPrivacy: {
    en: 'Blurring faces & plates...',
    hi: 'चेहरे और नंबर प्लेट धुंधली की जा रही है...',
    or: 'ମୁହଁ ଏବଂ ନମ୍ବର ପ୍ଲେଟ୍ ଅସ୍ପଷ୍ଟ କରାଯାଉଛି...',
  },
  step1: { en: 'Detecting waste type...', hi: 'कचरे का प्रकार पहचाना जा रहा है...', or: 'ଆବର୍ଜନା ପ୍ରକାର ଚିହ୍ନଟ ହେଉଛି...' },
  step2: { en: 'Estimating volume...', hi: 'मात्रा का अनुमान लगाया जा रहा है...', or: 'ପରିମାଣ ଆକଳନ ହେଉଛି...' },
  step3: { en: 'Checking severity...', hi: 'गंभीरता जांची जा रही है...', or: 'ଗମ୍ଭୀରତା ଯାଞ୍ଚ ହେଉଛି...' },
  step4: { en: 'Finding location...', hi: 'स्थान खोजा जा रहा है...', or: 'ଅବସ୍ଥାନ ଖୋଜା ଯାଉଛି...' },
  step5: {
    en: 'Checking for duplicates...',
    hi: 'डुप्लिकेट की जांच की जा रही है...',
    or: 'ନକଲ ପାଇଁ ଯାଞ୍ଚ ହେଉଛି...',
  },
  hint: { en: 'This may take a few seconds', hi: 'इसमें कुछ सेकंड लग सकते हैं', or: 'ଏଥିରେ କିଛି ସେକେଣ୍ଡ ଲାଗିପାରେ' },
  analysisFailed: { en: 'Analysis Failed', hi: 'विश्लेषण विफल', or: 'ବିଶ୍ଳେଷଣ ବିଫଳ' },
  tryAgain: { en: 'Try Again', hi: 'पुनः प्रयास करें', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ' },
  somethingWrong: {
    en: 'Something went wrong. Please try again.',
    hi: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
    or: 'କିଛି ଭୁଲ ହୋଇଗଲା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
  // Waste image validation (gatekeeper): shown when the photo doesn't
  // clearly show a genuine waste/sanitation issue. Wording matches the
  // feature spec exactly for English.
  invalidImageTitle: { en: 'Invalid Image', hi: 'अमान्य छवि', or: 'ଅବୈଧ ପ୍ରତିଛବି' },
  invalidImageMessage: {
    en: 'Invalid image. Please upload a clear photo showing a waste or sanitation issue. Selfies, random photos, screenshots, and unrelated images cannot be submitted as reports.',
    hi: 'अमान्य छवि। कृपया कचरे या स्वच्छता संबंधी समस्या दिखाने वाली स्पष्ट फोटो अपलोड करें। सेल्फी, अनावश्यक फोटो, स्क्रीनशॉट और असंबंधित छवियां रिपोर्ट के रूप में सबमिट नहीं की जा सकतीं।',
    or: 'ଅବୈଧ ପ୍ରତିଛବି। ଦୟାକରି ଆବର୍ଜନା କିମ୍ବା ସ୍ୱଚ୍ଛତା ସମସ୍ୟା ଦେଖାଉଥିବା ଏକ ସ୍ପଷ୍ଟ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ। ସେଲ୍ଫି, ଅନାବଶ୍ୟକ ଫଟୋ, ସ୍କ୍ରିନସଟ୍ ଏବଂ ଅସମ୍ପର୍କିତ ପ୍ରତିଛବି ରିପୋର୍ଟ ଭାବରେ ଦାଖଲ କରାଯାଇପାରିବ ନାହିଁ।',
  },
});

const reportResult = ns('reportResult', {
  title: { en: 'Analysis Result', hi: 'विश्लेषण परिणाम', or: 'ବିଶ୍ଳେଷଣ ଫଳାଫଳ' },
  aiAnalysis: { en: 'AI ANALYSIS', hi: 'AI विश्लेषण', or: 'AI ବିଶ୍ଳେଷଣ' },
  priority: { en: 'Priority: {priority}', hi: 'प्राथमिकता: {priority}', or: 'ପ୍ରାଥମିକତା: {priority}' },
  duplicateLabel: { en: 'Duplicate', hi: 'डुप्लिकेट', or: 'ନକଲ' },
  duplicateMatch: { en: '{percent}% Match', hi: '{percent}% मेल', or: '{percent}% ମେଳ' },
  noneFound: { en: 'None found', hi: 'कोई नहीं मिला', or: 'କିଛି ମିଳିଲା ନାହିଁ' },
  notAvailable: { en: 'Not Available', hi: 'उपलब्ध नहीं', or: 'ଉପଲବ୍ଧ ନାହିଁ' },
  wasteTypeDetection: {
    en: 'Waste Type Detection',
    hi: 'कचरे के प्रकार का पता लगाना',
    or: 'ଆବର୍ଜନା ପ୍ରକାର ଚିହ୍ନଟ',
  },
  secondary: { en: 'Secondary: {type}', hi: 'द्वितीयक: {type}', or: 'ଦ୍ୱିତୀୟ: {type}' },
  confidence: { en: 'Confidence', hi: 'विश्वास', or: 'ବିଶ୍ୱାସ' },
  detectedObjects: { en: 'Detected Objects', hi: 'पहचानी गई वस्तुएं', or: 'ଚିହ୍ନଟ ହୋଇଥିବା ବସ୍ତୁ' },
  visualEvidence: { en: 'Visual Evidence', hi: 'दृश्य साक्ष्य', or: 'ଦୃଶ୍ୟ ପ୍ରମାଣ' },
  aiExplanation: { en: 'AI Explanation', hi: 'AI स्पष्टीकरण', or: 'AI ବ୍ୟାଖ୍ୟା' },
  wasteTypeComparison: { en: 'Waste Type Comparison', hi: 'कचरा प्रकार तुलना', or: 'ଆବର୍ଜନା ପ୍ରକାର ତୁଳନା' },
  volumeEstimation: {
    en: 'Waste Volume Estimation',
    hi: 'कचरे की मात्रा का अनुमान',
    or: 'ଆବର୍ଜନା ପରିମାଣ ଆକଳନ',
  },
  estimatedVolume: { en: 'Estimated Volume', hi: 'अनुमानित मात्रा', or: 'ଆକଳିତ ପରିମାଣ' },
  approximate: { en: '(approximate)', hi: '(अनुमानित)', or: '(ପ୍ରାୟ)' },
  wasteCoverage: { en: 'Waste Coverage', hi: 'कचरा कवरेज', or: 'ଆବର୍ଜନା କଭରେଜ' },
  ofVisibleArea: { en: '{percent}% of visible area', hi: 'दृश्य क्षेत्र का {percent}%', or: 'ଦୃଶ୍ୟମାନ କ୍ଷେତ୍ରର {percent}%' },
  scaleReference: { en: 'Scale Reference', hi: 'स्केल संदर्भ', or: 'ସ୍କେଲ ସନ୍ଦର୍ଭ' },
  severityAnalysis: { en: 'Severity Analysis', hi: 'गंभीरता विश्लेषण', or: 'ଗମ୍ଭୀରତା ବିଶ୍ଳେଷଣ' },
  riskBreakdown: { en: 'Risk Breakdown', hi: 'जोखिम विश्लेषण', or: 'ବିପଦ ବିଭାଜନ' },
  wasteVolumeRisk: { en: 'Waste Volume', hi: 'कचरे की मात्रा', or: 'ଆବର୍ଜନା ପରିମାଣ' },
  drainageRisk: { en: 'Drainage Risk', hi: 'जल निकासी जोखिम', or: 'ନିଷ୍କାସନ ବିପଦ' },
  locationRisk: { en: 'Location Risk', hi: 'स्थान जोखिम', or: 'ଅବସ୍ଥାନ ବିପଦ' },
  hazardRisk: { en: 'Hazard Risk', hi: 'खतरा जोखिम', or: 'ବିପଦ ଆଶଙ୍କା' },
  wasteSpread: { en: 'Waste Spread', hi: 'कचरा फैलाव', or: 'ଆବର୍ଜନା ବିସ୍ତାର' },
  riskCards: { en: 'Risk Cards', hi: 'जोखिम कार्ड', or: 'ବିପଦ କାର୍ଡ' },
  volumeRiskCard: { en: 'Volume Risk', hi: 'मात्रा जोखिम', or: 'ପରିମାଣ ବିପଦ' },
  roadBlocking: { en: 'Road Blocking', hi: 'सड़क अवरोध', or: 'ରାସ୍ତା ଅବରୋଧ' },
  reason: { en: 'Reason', hi: 'कारण', or: 'କାରଣ' },
  duplicateComplaintDetection: {
    en: 'Duplicate Complaint Detection',
    hi: 'डुप्लिकेट शिकायत पहचान',
    or: 'ନକଲ ଅଭିଯୋଗ ଚିହ୍ନଟ',
  },
  duplicateCheckNotAvailable: {
    en: 'Duplicate Check: Not Available{suffix}',
    hi: 'डुप्लिकेट जांच: उपलब्ध नहीं{suffix}',
    or: 'ନକଲ ଯାଞ୍ଚ: ଉପଲବ୍ଧ ନାହିଁ{suffix}',
  },
  locationNotSetSuffix: {
    en: ' — location not set',
    hi: ' — स्थान सेट नहीं है',
    or: ' — ଅବସ୍ଥାନ ସେଟ୍ ହୋଇନାହିଁ',
  },
  noSimilarReportsFound: {
    en: 'No similar reports found nearby in the last 72 hours.',
    hi: 'पिछले 72 घंटों में आस-पास कोई समान रिपोर्ट नहीं मिली।',
    or: 'ଗତ 72 ଘଣ୍ଟାରେ ନିକଟରେ କୌଣସି ସମାନ ରିପୋର୍ଟ ମିଳିଲା ନାହିଁ।',
  },
  likelyDuplicate: { en: 'LIKELY DUPLICATE', hi: 'संभावित डुप्लिकेट', or: 'ସମ୍ଭାବିତ ନକଲ' },
  possibleDuplicate: { en: 'POSSIBLE DUPLICATE', hi: 'संभावित डुप्लिकेट हो सकता है', or: 'ସମ୍ଭାବ୍ୟ ନକଲ' },
  today: { en: 'Today', hi: 'आज', or: 'ଆଜି' },
  currentLocation: { en: 'Current Location', hi: 'वर्तमान स्थान', or: 'ବର୍ତ୍ତମାନ ଅବସ୍ଥାନ' },
  mAway: { en: '{m} m away', hi: '{m} मीटर दूर', or: '{m} ମିଟର ଦୂର' },
  locationIcon: { en: 'Location', hi: 'स्थान', or: 'ଅବସ୍ଥାନ' },
  timeIcon: { en: 'Time', hi: 'समय', or: 'ସମୟ' },
  wasteTypeIcon: { en: 'Waste Type', hi: 'कचरे का प्रकार', or: 'ଆବର୍ଜନା ପ୍ରକାର' },
  imageIcon: { en: 'Image', hi: 'छवि', or: 'ପ୍ରତିଛବି' },
  match: { en: 'Match', hi: 'मेल', or: 'ମେଳ' },
  existingComplaint: { en: 'Existing Complaint', hi: 'मौजूदा शिकायत', or: 'ବର୍ତ୍ତମାନର ଅଭିଯୋଗ' },
  status: { en: 'Status', hi: 'स्थिति', or: 'ସ୍ଥିତି' },
  aiRecommendation: { en: 'AI Recommendation', hi: 'AI सिफारिश', or: 'AI ସୁପାରିଶ' },
  recommendLink: {
    en: 'Link to existing complaint',
    hi: 'मौजूदा शिकायत से लिंक करें',
    or: 'ବର୍ତ୍ତମାନର ଅଭିଯୋଗ ସହିତ ଲିଙ୍କ କରନ୍ତୁ',
  },
  recommendReview: {
    en: 'Review before creating a new complaint',
    hi: 'नई शिकायत बनाने से पहले समीक्षा करें',
    or: 'ନୂଆ ଅଭିଯୋଗ ସୃଷ୍ଟି କରିବା ପୂର୍ବରୁ ସମୀକ୍ଷା କରନ୍ତୁ',
  },
  continueButton: { en: 'Continue', hi: 'जारी रखें', or: 'ଜାରି ରଖନ୍ତୁ' },
});

const reportConfirm = ns('reportConfirm', {
  title: { en: 'Confirm Details', hi: 'विवरण की पुष्टि करें', or: 'ବିବରଣୀ ନିଶ୍ଚିତ କରନ୍ତୁ' },
  editPhoto: { en: 'Edit Photo', hi: 'फोटो संपादित करें', or: 'ଫଟୋ ସମ୍ପାଦନ କରନ୍ତୁ' },
  location: { en: 'Location', hi: 'स्थान', or: 'ଅବସ୍ଥାନ' },
  tapToSetLocation: {
    en: 'Tap to set the report location',
    hi: 'रिपोर्ट स्थान सेट करने के लिए टैप करें',
    or: 'ରିପୋର୍ଟ ଅବସ୍ଥାନ ସେଟ୍ କରିବାକୁ ଟିପନ୍ତୁ',
  },
  commentsOptional: { en: 'Comments (Optional)', hi: 'टिप्पणियां (वैकल्पिक)', or: 'ମନ୍ତବ୍ୟ (ଇଚ୍ଛାଧୀନ)' },
  addMoreDetails: { en: 'Add more details...', hi: 'अधिक विवरण जोड़ें...', or: 'ଅଧିକ ବିବରଣୀ ଯୋଡ଼ନ୍ତୁ...' },
  submitReport: { en: 'Submit Report', hi: 'रिपोर्ट सबमिट करें', or: 'ରିପୋର୍ଟ ଦାଖଲ କରନ୍ତୁ' },
  setLocationHint: {
    en: 'Set a location above to submit this report.',
    hi: 'इस रिपोर्ट को सबमिट करने के लिए ऊपर एक स्थान सेट करें।',
    or: 'ଏହି ରିପୋର୍ଟ ଦାଖଲ କରିବାକୁ ଉପରେ ଏକ ଅବସ୍ଥାନ ସେଟ୍ କରନ୍ତୁ।',
  },
  couldNotSubmit: {
    en: 'Could not submit this report. Please try again.',
    hi: 'यह रिपोर्ट सबमिट नहीं हो सकी। कृपया पुनः प्रयास करें।',
    or: 'ଏହି ରିପୋର୍ଟ ଦାଖଲ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  },
});

const reportSubmitted = ns('reportSubmitted', {
  title: { en: 'Report Submitted!', hi: 'रिपोर्ट सबमिट हो गई!', or: 'ରିପୋର୍ଟ ଦାଖଲ ହେଲା!' },
  subtitle: {
    en: 'Thank you for helping keep our city clean.',
    hi: 'हमारे शहर को साफ रखने में मदद करने के लिए धन्यवाद।',
    or: 'ଆମ ସହରକୁ ପରିଷ୍କାର ରଖିବାରେ ସାହାଯ୍ୟ କରିଥିବାରୁ ଧନ୍ୟବାଦ।',
  },
  reportId: { en: 'Report ID', hi: 'रिपोर्ट आईडी', or: 'ରିପୋର୍ଟ ଆଇଡି' },
  submittedOn: { en: 'Submitted on', hi: 'जमा करने की तिथि', or: 'ଦାଖଲ ତାରିଖ' },
  goToMyReports: { en: 'Go to My Reports', hi: 'मेरी रिपोर्ट पर जाएं', or: 'ମୋର ରିପୋର୍ଟକୁ ଯାଆନ୍ତୁ' },
  // Geo-deduplication (20m merge): this submission was linked to an
  // existing active report instead of creating a new ticket.
  linkedReportId: { en: 'Linked Report ID', hi: 'लिंक की गई रिपोर्ट आईडी', or: 'ଲିଙ୍କ ହୋଇଥିବା ରିପୋର୍ଟ ଆଇଡି' },
  mergedTitle: { en: 'Confirmation Added!', hi: 'पुष्टि जोड़ी गई!', or: 'ନିଶ୍ଚିତକରଣ ଯୋଡ଼ାଗଲା!' },
  mergedSubtitle: {
    en: 'This issue was already reported nearby. Your report has been linked to the existing ticket as a community confirmation.',
    hi: 'यह समस्या पहले से ही पास में रिपोर्ट की जा चुकी है। आपकी रिपोर्ट को मौजूदा टिकट से एक सामुदायिक पुष्टि के रूप में जोड़ दिया गया है।',
    or: 'ଏହି ସମସ୍ୟା ପୂର୍ବରୁ ନିକଟରେ ରିପୋର୍ଟ ହୋଇସାରିଛି। ଆପଣଙ୍କ ରିପୋର୍ଟକୁ ଏକ ସାମୁଦାୟିକ ନିଶ୍ଚିତକରଣ ଭାବରେ ବର୍ତ୍ତମାନର ଟିକେଟ୍ ସହିତ ଲିଙ୍କ କରାଯାଇଛି।',
  },
  // Anti-spam: this same user had already reported/confirmed this exact
  // ticket before — required wording from the feature spec.
  alreadyReportedTitle: { en: 'Already Reported', hi: 'पहले से रिपोर्ट किया गया', or: 'ପୂର୍ବରୁ ରିପୋର୍ଟ ହୋଇଛି' },
  alreadyReportedSubtitle: {
    en: 'You have already reported or confirmed this issue. Your previous report has already been recorded.',
    hi: 'आपने पहले ही इस समस्या की रिपोर्ट या पुष्टि कर दी है। आपकी पिछली रिपोर्ट पहले से दर्ज है।',
    or: 'ଆପଣ ପୂର୍ବରୁ ଏହି ସମସ୍ୟାକୁ ରିପୋର୍ଟ କିମ୍ବା ନିଶ୍ଚିତ କରିସାରିଛନ୍ତି। ଆପଣଙ୍କ ପୂର୍ବ ରିପୋର୍ଟ ପୂର୍ବରୁ ଦାଖଲ ହୋଇସାରିଛି।',
  },
});

const reportStatusPage = ns('reportStatusPage', {
  title: { en: 'Report Status', hi: 'रिपोर्ट स्थिति', or: 'ରିପୋର୍ଟ ସ୍ଥିତି' },
  couldNotFind: { en: 'Could not find this report.', hi: 'यह रिपोर्ट नहीं मिली।', or: 'ଏହି ରିପୋର୍ଟ ମିଳିଲା ନାହିଁ।' },
  reportedAgo: { en: 'Reported {time}', hi: '{time} पहले रिपोर्ट की गई', or: '{time} ପୂର୍ବେ ରିପୋର୍ଟ ହୋଇଛି' },
  stepSubmittedDesc: {
    en: 'Your report was received.',
    hi: 'आपकी रिपोर्ट प्राप्त हो गई।',
    or: 'ଆପଣଙ୍କ ରିପୋର୍ଟ ଗ୍ରହଣ ହୋଇଛି।',
  },
  stepTeamAssignedDesc: {
    en: 'A cleanup team has been assigned to this report.',
    hi: 'इस रिपोर्ट के लिए एक सफाई टीम नियुक्त की गई है।',
    or: 'ଏହି ରିପୋର୍ଟ ପାଇଁ ଏକ ସଫେଇ ଦଳ ନ୍ୟସ୍ତ ହୋଇଛି।',
  },
  stepInProgressDesc: {
    en: 'The team is actively working on cleanup.',
    hi: 'टीम सक्रिय रूप से सफाई पर काम कर रही है।',
    or: 'ଦଳ ସକ୍ରିୟ ଭାବରେ ସଫେଇ କାର୍ଯ୍ୟ କରୁଛି।',
  },
  stepResolvedDesc: {
    en: 'This waste issue has been cleaned up.',
    hi: 'यह कचरा समस्या साफ कर दी गई है।',
    or: 'ଏହି ଆବର୍ଜନା ସମସ୍ୟା ସଫା ହୋଇଯାଇଛି।',
  },
  cleanupPhotos: { en: 'Cleanup Photos', hi: 'सफाई की तस्वीरें', or: 'ସଫେଇ ଫଟୋ' },
  thanksForRating: {
    en: 'Thanks for rating this cleanup!',
    hi: 'इस सफाई को रेट करने के लिए धन्यवाद!',
    or: 'ଏହି ସଫେଇକୁ ରେଟ୍ କରିଥିବାରୁ ଧନ୍ୟବାଦ!',
  },
  rateThisCleanup: { en: 'Rate This Cleanup', hi: 'इस सफाई को रेट करें', or: 'ଏହି ସଫେଇକୁ ରେଟ୍ କରନ୍ତୁ' },
});

const reportFeedback = ns('reportFeedback', {
  title: { en: 'Rate This Cleanup', hi: 'इस सफाई को रेट करें', or: 'ଏହି ସଫେଇକୁ ରେଟ୍ କରନ୍ତୁ' },
  howWasCleanup: { en: 'How was the cleanup?', hi: 'सफाई कैसी थी?', or: 'ସଫେଇ କେମିତି ଥିଲା?' },
  addCommentOptional: {
    en: 'Add a Comment (Optional)',
    hi: 'एक टिप्पणी जोड़ें (वैकल्पिक)',
    or: 'ଏକ ମନ୍ତବ୍ୟ ଯୋଡ଼ନ୍ତୁ (ଇଚ୍ଛାଧୀନ)',
  },
  tellUsHowItWent: {
    en: 'Tell us how it went...',
    hi: 'हमें बताएं कि यह कैसा रहा...',
    or: 'ଏହା କେମିତି ହେଲା ଆମକୁ କୁହନ୍ତୁ...',
  },
  submitReview: { en: 'Submit Review', hi: 'समीक्षा सबमिट करें', or: 'ସମୀକ୍ଷା ଦାଖଲ କରନ୍ତୁ' },
  pickARating: { en: 'Pick a rating', hi: 'एक रेटिंग चुनें', or: 'ଏକ ରେଟିଂ ବାଛନ୍ତୁ' },
  tapStarToRate: {
    en: 'Tap a star to rate this cleanup.',
    hi: 'इस सफाई को रेट करने के लिए एक स्टार पर टैप करें।',
    or: 'ଏହି ସଫେଇକୁ ରେଟ୍ କରିବାକୁ ଏକ ତାରା ଟିପନ୍ତୁ।',
  },
  couldNotSubmitReview: {
    en: 'Could not submit review',
    hi: 'समीक्षा सबमिट नहीं हो सकी',
    or: 'ସମୀକ୍ଷା ଦାଖଲ ହୋଇପାରିଲା ନାହିଁ',
  },
});

const fieldTaskDetail = ns('fieldTaskDetail', {
  reportedOn: { en: 'Reported On', hi: 'रिपोर्ट की तिथि', or: 'ରିପୋର୍ଟ ତାରିଖ' },
  reportedBy: { en: 'Reported By', hi: 'रिपोर्ट करने वाला', or: 'ରିପୋର୍ଟ କରିଥିବା' },
  citizenAppUser: { en: 'Citizen (App User)', hi: 'नागरिक (ऐप उपयोगकर्ता)', or: 'ନାଗରିକ (ଆପ୍ ଉପଯୋଗକର୍ତ୍ତା)' },
  description: { en: 'Description', hi: 'विवरण', or: 'ବିବରଣୀ' },
  noDetailsProvided: {
    en: 'No additional details were provided with this report.',
    hi: 'इस रिपोर्ट के साथ कोई अतिरिक्त विवरण प्रदान नहीं किया गया।',
    or: 'ଏହି ରିପୋର୍ଟ ସହିତ କୌଣସି ଅତିରିକ୍ତ ବିବରଣୀ ଦିଆଯାଇ ନାହିଁ।',
  },
  aiAnalysis: { en: 'AI Analysis', hi: 'AI विश्लेषण', or: 'AI ବିଶ୍ଳେଷଣ' },
  wasteType: { en: 'Waste Type', hi: 'कचरे का प्रकार', or: 'ଆବର୍ଜନା ପ୍ରକାର' },
  volumeEstimated: { en: 'Volume (Estimated)', hi: 'मात्रा (अनुमानित)', or: 'ପରିମାଣ (ଆକଳିତ)' },
  severityScore: { en: 'Severity Score', hi: 'गंभीरता स्कोर', or: 'ଗମ୍ଭୀରତା ସ୍କୋର' },
  notAvailable: { en: 'Not available', hi: 'उपलब्ध नहीं', or: 'ଉପଲବ୍ଧ ନାହିଁ' },
  submittedRecently: { en: 'recently', hi: 'हाल ही में', or: 'ସାମ୍ପ୍ରତିକ' },
  submittedWaitingApproval: {
    en: 'Submitted {time}. Waiting for admin approval.',
    hi: '{time} सबमिट किया गया। एडमिन की मंजूरी की प्रतीक्षा है।',
    or: '{time} ଦାଖଲ ହୋଇଛି। ଆଡମିନ୍ ଅନୁମୋଦନ ଅପେକ୍ଷାରେ।',
  },
  approvedComplete: {
    en: 'This task was approved and marked complete.',
    hi: 'यह कार्य स्वीकृत किया गया और पूर्ण चिह्नित किया गया।',
    or: 'ଏହି କାର୍ଯ୍ୟ ଅନୁମୋଦିତ ହୋଇ ସମାପ୍ତ ଚିହ୍ନିତ ହୋଇଛି।',
  },
  couldNotFindTask: { en: 'Could not find this task.', hi: 'यह कार्य नहीं मिला।', or: 'ଏହି କାର୍ଯ୍ୟ ମିଳିଲା ନାହିଁ।' },
  goBack: { en: 'Go Back', hi: 'वापस जाएं', or: 'ପଛକୁ ଯାଆନ୍ତୁ' },
  couldNotStartTask: {
    en: 'Could not start task',
    hi: 'कार्य शुरू नहीं हो सका',
    or: 'କାର୍ଯ୍ୟ ଆରମ୍ଭ ହୋଇପାରିଲା ନାହିଁ',
  },
});

const fieldTaskOnTheWay = ns('fieldTaskOnTheWay', {
  title: { en: 'On the Way', hi: 'रास्ते में', or: 'ରାସ୍ତାରେ' },
  eta: { en: 'ETA', hi: 'अनुमानित समय', or: 'ETA' },
  calculating: { en: 'Calculating…', hi: 'गणना हो रही है…', or: 'ଗଣନା ହେଉଛି…' },
  iHaveReached: { en: 'I Have Reached', hi: 'मैं पहुंच गया हूं', or: 'ମୁଁ ପହଞ୍ଚିଗଲି' },
  couldNotUpdateTask: {
    en: 'Could not update task',
    hi: 'कार्य अपडेट नहीं हो सका',
    or: 'କାର୍ଯ୍ୟ ଅପଡେଟ୍ ହୋଇପାରିଲା ନାହିଁ',
  },
  couldNotFindTask: { en: 'Could not find this task.', hi: 'यह कार्य नहीं मिला।', or: 'ଏହି କାର୍ଯ୍ୟ ମିଳିଲା ନାହିଁ।' },
});

const fieldTaskProgress = ns('fieldTaskProgress', {
  uploadProgress: { en: 'Upload Progress', hi: 'प्रगति अपलोड करें', or: 'ପ୍ରଗତି ଅପଲୋଡ୍ କରନ୍ତୁ' },
  addAtLeastPhotos: {
    en: '(Add at least {n} photos)',
    hi: '(कम से कम {n} फोटो जोड़ें)',
    or: '(ଅତି କମରେ {n} ଫଟୋ ଯୋଡ଼ନ୍ତୁ)',
  },
  addNotesOptional: { en: 'Add Notes (Optional)', hi: 'नोट्स जोड़ें (वैकल्पिक)', or: 'ଟିପ୍ପଣୀ ଯୋଡ଼ନ୍ତୁ (ଇଚ୍ଛାଧୀନ)' },
  notesPlaceholder: {
    en: 'e.g. Garbage collected and area cleaned.',
    hi: 'जैसे कचरा एकत्र किया गया और क्षेत्र साफ किया गया।',
    or: 'ଉଦାହରଣ: ଆବର୍ଜନା ସଂଗ୍ରହ ହେଲା ଏବଂ ଅଞ୍ଚଳ ସଫା ହେଲା।',
  },
  submitForReview: { en: 'Submit for Review', hi: 'समीक्षा के लिए सबमिट करें', or: 'ସମୀକ୍ଷା ପାଇଁ ଦାଖଲ କରନ୍ତୁ' },
  cancelTask: { en: 'Cancel Task', hi: 'कार्य रद्द करें', or: 'କାର୍ଯ୍ୟ ବାତିଲ୍ କରନ୍ତୁ' },
  photoLimitReached: { en: 'Photo limit reached', hi: 'फोटो सीमा पूरी हो गई', or: 'ଫଟୋ ସୀମା ପହଞ୍ଚିଲା' },
  photoLimitBody: {
    en: 'You can attach up to {n} photos.',
    hi: 'आप अधिकतम {n} फोटो जोड़ सकते हैं।',
    or: 'ଆପଣ ସର୍ବାଧିକ {n} ଫଟୋ ଯୋଡ଼ିପାରିବେ।',
  },
  addPhoto: { en: 'Add Photo', hi: 'फोटो जोड़ें', or: 'ଫଟୋ ଯୋଡ଼ନ୍ତୁ' },
  cameraPermissionNeeded: {
    en: 'Camera permission needed',
    hi: 'कैमरा अनुमति आवश्यक है',
    or: 'କ୍ୟାମେରା ଅନୁମତି ଆବଶ୍ୟକ',
  },
  enableCameraProgress: {
    en: 'Enable camera access to take a progress photo.',
    hi: 'प्रगति फोटो लेने के लिए कैमरा एक्सेस सक्षम करें।',
    or: 'ପ୍ରଗତି ଫଟୋ ନେବାକୁ କ୍ୟାମେରା ପ୍ରବେଶ ସକ୍ଷମ କରନ୍ତୁ।',
  },
  photoLibraryPermissionNeeded: {
    en: 'Photo library permission needed',
    hi: 'फोटो लाइब्रेरी अनुमति आवश्यक है',
    or: 'ଫଟୋ ଲାଇବ୍ରେରୀ ଅନୁମତି ଆବଶ୍ୟକ',
  },
  enableGalleryProgress: {
    en: 'Enable photo access to attach progress photos.',
    hi: 'प्रगति फोटो जोड़ने के लिए फोटो एक्सेस सक्षम करें।',
    or: 'ପ୍ରଗତି ଫଟୋ ଯୋଡ଼ିବାକୁ ଫଟୋ ପ୍ରବେଶ ସକ୍ଷମ କରନ୍ତୁ।',
  },
  couldNotSubmit: { en: 'Could not submit', hi: 'सबमिट नहीं हो सका', or: 'ଦାଖଲ ହୋଇପାରିଲା ନାହିଁ' },
  cancelTaskConfirmTitle: {
    en: 'Cancel this task?',
    hi: 'इस कार्य को रद्द करें?',
    or: 'ଏହି କାର୍ଯ୍ୟ ବାତିଲ୍ କରିବେ?',
  },
  cancelTaskConfirmBody: {
    en: 'It will go back to "New" so you (or another team) can pick it up again.',
    hi: 'यह "नया" पर वापस चला जाएगा ताकि आप (या कोई अन्य टीम) इसे फिर से ले सकें।',
    or: 'ଏହା "ନୂଆ" କୁ ଫେରିଯିବ ଯାହା ଫଳରେ ଆପଣ (କିମ୍ବା ଅନ୍ୟ ଦଳ) ଏହାକୁ ପୁଣି ନେଇପାରିବେ।',
  },
  keepWorking: { en: 'Keep Working', hi: 'काम जारी रखें', or: 'କାମ ଜାରି ରଖନ୍ତୁ' },
  couldNotCancel: { en: 'Could not cancel', hi: 'रद्द नहीं हो सका', or: 'ବାତିଲ୍ ହୋଇପାରିଲା ନାହିଁ' },
  couldNotFindTask: { en: 'Could not find this task.', hi: 'यह कार्य नहीं मिला।', or: 'ଏହି କାର୍ଯ୍ୟ ମିଳିଲା ନାହିଁ।' },
});

const fieldTaskSubmitted = ns('fieldTaskSubmitted', {
  title: { en: 'Submitted for Review!', hi: 'समीक्षा के लिए सबमिट किया गया!', or: 'ସମୀକ୍ଷା ପାଇଁ ଦାଖଲ ହେଲା!' },
  subtitle: {
    en: 'Great work! Your task has been submitted for verification.',
    hi: 'बहुत बढ़िया! आपका कार्य सत्यापन के लिए सबमिट कर दिया गया है।',
    or: 'ବହୁତ ଭଲ! ଆପଣଙ୍କ କାର୍ଯ୍ୟ ଯାଞ୍ଚ ପାଇଁ ଦାଖଲ ହୋଇଛି।',
  },
  submittedOn: { en: 'Submitted On', hi: 'जमा करने की तिथि', or: 'ଦାଖଲ ତାରିଖ' },
  backToTasks: { en: 'Back to Tasks', hi: 'कार्यों पर वापस जाएं', or: 'କାର୍ଯ୍ୟକୁ ଫେରନ୍ତୁ' },
});

const personalInfo = ns('personalInfo', {
  title: { en: 'Personal Information', hi: 'व्यक्तिगत जानकारी', or: 'ବ୍ୟକ୍ତିଗତ ସୂଚନା' },
  fullName: { en: 'Full Name', hi: 'पूरा नाम', or: 'ପୂର୍ଣ୍ଣ ନାମ' },
  email: { en: 'Email', hi: 'ईमेल', or: 'ଇମେଲ୍' },
  savedLocation: { en: 'Saved Location', hi: 'सहेजा गया स्थान', or: 'ସେଭ୍ ହୋଇଥିବା ସ୍ଥାନ' },
  notSet: { en: 'Not set', hi: 'सेट नहीं है', or: 'ସେଟ୍ ହୋଇନାହିଁ' },
  memberSince: { en: 'Member Since', hi: 'सदस्य बने', or: 'ସଦସ୍ୟ ହୋଇଥିବା ତାରିଖ' },
});

const savedLocationsPage = ns('savedLocationsPage', {
  title: { en: 'Saved Locations', hi: 'सहेजे गए स्थान', or: 'ସେଭ୍ ହୋଇଥିବା ସ୍ଥାନ' },
  noLocationsYet: {
    en: "No locations yet. They'll show up once you submit a report.",
    hi: 'अभी तक कोई स्थान नहीं। रिपोर्ट सबमिट करते ही वे यहां दिखाई देंगे।',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସ୍ଥାନ ନାହିଁ। ରିପୋର୍ଟ ଦାଖଲ କରିବା ପରେ ସେଗୁଡ଼ିକ ଏଠାରେ ଦେଖାଯିବ।',
  },
});

const notificationsPage = ns('notificationsPage', {
  title: { en: 'Notifications', hi: 'सूचनाएं', or: 'ବିଜ୍ଞପ୍ତି' },
});

const wasteHotspotsPage = ns('wasteHotspotsPage', {
  title: { en: 'Waste Hotspots', hi: 'कचरा हॉटस्पॉट', or: 'ଆବର୍ଜନା ହଟସ୍ପଟ' },
  high: { en: 'High', hi: 'उच्च', or: 'ଉଚ୍ଚ' },
  medium: { en: 'Medium', hi: 'मध्यम', or: 'ମଧ୍ୟମ' },
  low: { en: 'Low', hi: 'निम्न', or: 'ନିମ୍ନ' },
  noHotspotsYet: {
    en: 'No waste hotspots reported yet. Be the first to report one!',
    hi: 'अभी तक कोई कचरा हॉटस्पॉट रिपोर्ट नहीं किया गया। पहले रिपोर्ट करने वाले बनें!',
    or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଆବର୍ଜନା ହଟସ୍ପଟ ରିପୋର୍ଟ ହୋଇନାହିଁ। ପ୍ରଥମେ ରିପୋର୍ଟ କରନ୍ତୁ!',
  },
  couldNotLoad: {
    en: "Couldn't load hotspots: {error}",
    hi: 'हॉटस्पॉट लोड नहीं हो सके: {error}',
    or: 'ହଟସ୍ପଟ ଲୋଡ୍ ହୋଇପାରିଲା ନାହିଁ: {error}',
  },
  markersFailedToDraw: {
    en: 'Markers failed to draw: {error}',
    hi: 'मार्कर बनाने में विफल: {error}',
    or: 'ମାର୍କର ଅଙ୍କନ ବିଫଳ: {error}',
  },
  foundButNoMarkers: {
    en: "Found {n} reports but couldn't place any markers.",
    hi: '{n} रिपोर्ट मिलीं लेकिन कोई मार्कर नहीं लगाया जा सका।',
    or: '{n} ରିପୋର୍ଟ ମିଳିଲା କିନ୍ତୁ କୌଣସି ମାର୍କର ରଖାଯାଇ ପାରିଲା ନାହିଁ।',
  },
  retry: { en: 'Retry', hi: 'पुनः प्रयास करें', or: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ' },
  viewAllOnMap: { en: 'View All on Map', hi: 'मानचित्र पर सभी देखें', or: 'ମାନଚିତ୍ରରେ ସବୁ ଦେଖନ୍ତୁ' },
});

const locationPicker = ns('locationPicker', {
  setLocationTitle: { en: 'Set Location', hi: 'स्थान सेट करें', or: 'ଅବସ୍ଥାନ ସେଟ୍ କରନ୍ତୁ' },
  setYourLocationTitle: { en: 'Set Your Location', hi: 'अपना स्थान सेट करें', or: 'ଆପଣଙ୍କ ଅବସ୍ଥାନ ସେଟ୍ କରନ୍ତୁ' },
  mapHint: {
    en: 'Tap or drag the pin to set the exact spot',
    hi: 'सटीक स्थान सेट करने के लिए पिन को टैप या खींचें',
    or: 'ସଠିକ୍ ସ୍ଥାନ ସେଟ୍ କରିବାକୁ ପିନ୍ କୁ ଟିପନ୍ତୁ କିମ୍ବା ଟାଣନ୍ତୁ',
  },
  useCurrentLocation: {
    en: 'Use Current Location',
    hi: 'वर्तमान स्थान का उपयोग करें',
    or: 'ବର୍ତ୍ତମାନ ଅବସ୍ଥାନ ବ୍ୟବହାର କରନ୍ତୁ',
  },
  resolvingAddress: { en: 'Resolving address...', hi: 'पता खोजा जा रहा है...', or: 'ଠିକଣା ସମାଧାନ ହେଉଛି...' },
  tapMapToDropPin: {
    en: 'Tap the map to drop a pin',
    hi: 'पिन लगाने के लिए मानचित्र पर टैप करें',
    or: 'ପିନ୍ ଲଗାଇବାକୁ ମାନଚିତ୍ରରେ ଟିପନ୍ତୁ',
  },
  confirmLocation: { en: 'Confirm Location', hi: 'स्थान की पुष्टि करें', or: 'ଅବସ୍ଥାନ ନିଶ୍ଚିତ କରନ୍ତୁ' },
  locationAccessNeeded: {
    en: 'Location access needed',
    hi: 'स्थान एक्सेस आवश्यक है',
    or: 'ଅବସ୍ଥାନ ପ୍ରବେଶ ଆବଶ୍ୟକ',
  },
  allowLocationCurrentPosition: {
    en: 'Allow location access to use your current position.',
    hi: 'अपनी वर्तमान स्थिति का उपयोग करने के लिए स्थान एक्सेस की अनुमति दें।',
    or: 'ଆପଣଙ୍କର ବର୍ତ୍ତମାନ ଅବସ୍ଥାନ ବ୍ୟବହାର କରିବାକୁ ଅବସ୍ଥାନ ପ୍ରବେଶକୁ ଅନୁମତି ଦିଅନ୍ତୁ।',
  },
  couldNotGetLocation: { en: 'Could not get location', hi: 'स्थान प्राप्त नहीं हो सका', or: 'ଅବସ୍ଥାନ ମିଳିଲା ନାହିଁ' },
  tryAgainOrSetManually: {
    en: 'Please try again or set a location manually on the map.',
    hi: 'कृपया पुनः प्रयास करें या मानचित्र पर मैन्युअल रूप से स्थान सेट करें।',
    or: 'ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ମାନଚିତ୍ରରେ ମାନୁଆଲ୍ ଭାବରେ ଅବସ୍ଥାନ ସେଟ୍ କରନ୍ତୁ।',
  },
});

const fieldReportsExtra = ns('fieldReports', {
  vsYesterday: { en: 'vs yesterday', hi: 'कल की तुलना में', or: 'ଗତକାଲି ତୁଳନାରେ' },
  vsLastWeek: { en: 'vs last week', hi: 'पिछले सप्ताह की तुलना में', or: 'ଗତ ସପ୍ତାହ ତୁଳନାରେ' },
  vsLastMonth: { en: 'vs last month', hi: 'पिछले महीने की तुलना में', or: 'ଗତ ମାସ ତୁଳନାରେ' },
});

export const translations: Record<string, Entry> = {
  ...common,
  ...languageSelect,
  ...citizenTabs,
  ...fieldTabs,
  ...citizenHome,
  ...myReports,
  ...report,
  ...citizenProfile,
  ...fieldHome,
  ...fieldTasks,
  ...fieldReports,
  ...fieldReportsExtra,
  ...fieldMap,
  ...fieldProfile,
  ...wasteCategory,
  ...severityLevel,
  ...priorityLevel,
  ...volumeSize,
  ...reportStatus,
  ...fieldTaskStatus,
  ...teamStatus,
  ...timeAgo,
  ...reportScan,
  ...reportResult,
  ...reportConfirm,
  ...reportSubmitted,
  ...reportStatusPage,
  ...reportFeedback,
  ...fieldTaskDetail,
  ...fieldTaskOnTheWay,
  ...fieldTaskProgress,
  ...fieldTaskSubmitted,
  ...personalInfo,
  ...savedLocationsPage,
  ...notificationsPage,
  ...wasteHotspotsPage,
  ...locationPicker,
};

export type TranslationKey = keyof typeof translations;
