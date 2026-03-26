import './style.css';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { app, db, auth } from './firebase.js';

// ================= State & Translations =================
const appState = {
  lang: 'en',
  currentView: 'home',
  complaintData: {
    name: '',
    email: '',
    location: '',
    incidentType: '',
    description: '',
    isModified: false // Track if user manually changed it so we don't overwrite if they just switch language
  },
  complaintId: null,
  chatMessages: [],
  isRecording: false,
  user: null,
  loginMode: 'login',     // 'login' or 'register'
  authMode: 'phone',      // 'phone' or 'email'
  phoneConfirmResult: null, // Firebase OTP confirmation result
  redirectAfterLogin: null
};
window.appState = appState;

const i18n = {
  en: {
    navHelp: "AI Help",
    heroTitle: 'File Police Complaints Easily with <span class="text-accent text-gradient">AI Assistance</span>',
    heroSub: 'Experience a modern, secure, and hassle-free way to report incidents. Our AI guides you step-by-step.',
    btnStart: '<i class="ph-fill ph-shield-check"></i> Start Complaint',
    btnTrack: '<i class="ph ph-magnifying-glass"></i> Track Status',
    featVoice: 'Voice Enabled',
    featVoiceSub: 'Speak your complaint naturally in your regional language.',
    featAuto: 'Auto Drafting',
    featAutoSub: 'AI automatically formats your words into official documents.',
    chatAiMsg1: 'Hello! I am here to help you register a police complaint safely and easily. Could you start by telling me what happened? You can type or use the microphone.',
    chatAiExtracting: "I'm extracting details now. Based on what you said, I will prepare a report for you. Please click 'Next Step' to review the extracted information.",
    chatInput: 'Type your message here... (Press Enter)',
    nextStep: 'Next Step',
    trackTitle: 'Track Complaint Status',
    trackSub: 'Enter your 10-digit FIR or Complaint ID to check real-time updates.',
    trackBtn: 'Check Status',
    trackStatusResult: 'Your complaint is currently under review by the cyber cell.',
    formTitle: 'Review Extracted Details',
    formSub: 'Our AI has filled out this form based on your chat. Please verify.',
    formName: 'Complainant Name',
    formEmail: 'Email Address',
    formLoc: 'Incident Location',
    formCat: 'Incident Category',
    formDesc: 'Detailed Description',
    btnBackChat: 'Back to Chat',
    btnProceed: 'Proceed to Document',
    btnCancel: 'Cancel',
    
    // Mock Data
    mockName: 'Rahul Kumar',
    mockLoc: 'Central Market Sector 12',
    mockDesc: 'My black iPhone 13 (128GB) was stolen yesterday evening around 6:00 PM near the central market electronics shop area while I was walking.',
    catOptions: ['Theft / Robbery', 'Mobile/Device Stolen', 'Cyber Crime', 'Assault'],
    defaultCat: 'Mobile/Device Stolen',
    // Auth UI
    authPhoneTab: '📱 Login with Phone',
    authEmailTab: '✉️ Login with Email',
    authPhoneLabel: 'Phone Number',
    authPhonePlaceholder: 'Enter 10-digit mobile number',
    authSendOTP: 'Send OTP',
    authOTPLabel: 'Enter OTP',
    authOTPPlaceholder: '6-digit OTP',
    authVerifyOTP: 'Verify & Login',
    authResendOTP: 'Resend OTP',
    authNameLabel: 'Full Name',
    authEmailLabel: 'Email Address',
    authPasswordLabel: 'Password',
    authLoginBtn: 'Login',
    authRegisterBtn: 'Create Account',
    authSwitchToRegister: "Don't have an account? Register here",
    authSwitchToLogin: 'Already have an account? Login here',
    authOTPSent: '✅ OTP sent! Please check your phone.',
    authSuccess: '✅ Logged in successfully!',
    authTrackPhone: 'Track via Phone OTP'
  },
  hi: {
    navHelp: "AI सहायता",
    heroTitle: 'पुलिस शिकायतें आसानी से दर्ज करें <span class="text-accent text-gradient">AI सहायता के साथ</span>',
    heroSub: 'घटनाओं की रिपोर्ट करने का एक आधुनिक और सुरक्षित तरीका। हमारा AI आपको कदम-दर-कदम मार्गदर्शन करता है।',
    btnStart: '<i class="ph-fill ph-shield-check"></i> शिकायत शुरू करें',
    btnTrack: '<i class="ph ph-magnifying-glass"></i> स्थिति ट्रैक करें',
    featVoice: 'वॉयस सक्षम',
    featVoiceSub: 'अपनी शिकायत को अपनी क्षेत्रीय भाषा में स्वाभाविक रूप से बोलें।',
    featAuto: 'ऑटो ड्राफ्टिंग',
    featAutoSub: 'AI स्वचालित रूप से आपके शब्दों को आधिकारिक दस्तावेजों में प्रारूपित करता है।',
    chatAiMsg1: 'नमस्ते! मैं यहाँ आपको सुरक्षित और आसानी से पुलिस शिकायत दर्ज करने में मदद करने के लिए हूँ। क्या आप बता सकते हैं कि क्या हुआ?',
    chatAiExtracting: 'मैं अब विवरण निकाल रहा हूँ। मैं एक रिपोर्ट तैयार करूँगा। कृपया निकाले गए विवरण की समीक्षा करने के लिए "अगला कदम" पर क्लिक करें।',
    chatInput: 'अपना संदेश टाइप करें...',
    nextStep: 'अगला कदम',
    trackTitle: 'शिकायत की स्थिति ट्रैक करें',
    trackSub: 'अपना 10-अंकीय FIR या शिकायत ID दर्ज करें।',
    trackBtn: 'स्थिति जांचें',
    trackStatusResult: 'आपकी शिकायत वर्तमान में साइबर सेल द्वारा समीक्षाधीन है।',
    formTitle: 'निकाले गए विवरण की समीक्षा करें',
    formSub: 'हमारे AI ने आपकी चैट के आधार पर यह फ़ॉर्म भरा है। कृपया सत्यापित करें।',
    formName: 'शिकायतकर्ता का नाम',
    formEmail: 'ईमेल पता',
    formLoc: 'घटना स्थल',
    formCat: 'घटना श्रेणी',
    formDesc: 'विस्तृत विवरण',
    btnBackChat: 'चैट पर वापस जाएं',
    btnProceed: 'दस्तावेज़ पर आगे बढ़ें',
    btnCancel: 'रद्द करें',
    mockName: 'राहुल कुमार',
    mockLoc: 'सेंट्रल मार्केट सेक्टर 12',
    mockDesc: 'मेरा काला iPhone 13 (128GB) कल शाम करीब 6:00 बजे सेंट्रल मार्केट इलेक्ट्रॉनिक्स दुकान क्षेत्र के पास चोरी हो गया था जब मैं चल रहा था।',
    catOptions: ['चोरी / लूट', 'मोबाइल/उपकरण चोरी', 'साइबर अपराध', 'हमला'],
    defaultCat: 'मोबाइल/उपकरण चोरी',
    // Auth UI
    authPhoneTab: '📱 फोन से लॉगिन',
    authEmailTab: '✉️ ईमेल से लॉगिन',
    authPhoneLabel: 'फोन नंबर',
    authPhonePlaceholder: '10-अंकीय मोबाइल नंबर दर्ज करें',
    authSendOTP: 'OTP भेजें',
    authOTPLabel: 'OTP दर्ज करें',
    authOTPPlaceholder: '6-अंकीय OTP',
    authVerifyOTP: 'सत्यापित करें और लॉगिन करें',
    authResendOTP: 'OTP दोबारा भेजें',
    authNameLabel: 'पूरा नाम',
    authEmailLabel: 'ईमेल पता',
    authPasswordLabel: 'पासवर्ड',
    authLoginBtn: 'लॉगिन',
    authRegisterBtn: 'खाता बनाएं',
    authSwitchToRegister: 'खाता नहीं है? यहाँ पंजीकरण करें',
    authSwitchToLogin: 'पहले से खाता है? यहाँ लॉगिन करें',
    authOTPSent: '✅ OTP भेज दिया गया! अपना फोन जांचें।',
    authSuccess: '✅ सफलतापूर्वक लॉग इन हो गए!',
    authTrackPhone: 'फोन OTP से ट्रैक करें'
  },
  te: {
    navHelp: "AI సహాయం",
    heroTitle: 'పోలీసు ఫిర్యాదులను సులభంగా ఫైల్ చేయండి <span class="text-accent text-gradient">AI సహాయంతో</span>',
    heroSub: 'ఆధునిక, సురక్షితమైన మార్గంలో ఫిర్యాదు చేయండి. మా AI మీకు దశల వారీగా మార్గనిర్దేశం చేస్తుంది.',
    btnStart: '<i class="ph-fill ph-shield-check"></i> ఫిర్యాదు ప్రారంభించండి',
    btnTrack: '<i class="ph ph-magnifying-glass"></i> స్టేటస్ ట్రాక్ చేయండి',
    featVoice: 'వాయిస్ ఎనేబుల్ చేయబడింది',
    featVoiceSub: 'మీ ప్రాంతీయ భాషలో మీ ఫిర్యాదును సహజంగా మాట్లాడండి.',
    featAuto: 'ఆటో డ్రాఫ్టింగ్',
    featAutoSub: 'AI మీ పదాలను అధికారిక పత్రాలుగా స్వయంచాలకంగా ఫార్మాట్ చేస్తుంది.',
    chatAiMsg1: 'నమస్కారం! నేను మీకు సురక్షితంగా మరియు సులభంగా పోలీసు ఫిర్యాదు నమోదు చేయడానికి సహాయపడటానికి ఇక్కడ ఉన్నాను. ఏమి జరిగిందో చెప్పగలరా?',
    chatAiExtracting: 'నేను ఇప్పుడు వివరాలను సంగ్రహిస్తున్నాను. నేను నివేదికను సిద్ధం చేస్తాను. సేకరించిన సమాచారాన్ని సమీక్షించడానికి దయచేసి "తదుపరి దశ" పై క్లిక్ చేయండి.',
    chatInput: 'మీ సందేశాన్ని టైప్ చేయండి...',
    nextStep: 'తదుపరి దశ',
    trackTitle: 'ఫిర్యాదు స్టేటస్ ట్రాక్ చేయండి',
    trackSub: 'మీ 10-అంకెల FIR లేదా ఫిర్యాదు ID నమోదు చేయండి.',
    trackBtn: 'స్టేటస్ తనిఖీ చేయండి',
    trackStatusResult: 'మీ ఫిర్యాదు ప్రస్తుతం సైబర్ సెల్ ద్వారా సమీక్షలో ఉంది.',
    formTitle: 'సేకరించిన వివరాలను సమీక్షించండి',
    formSub: 'మా AI మీ చాట్ ఆధారంగా ఈ ఫారమ్‌ను పూరించింది. దయచేసి ధృవీకరించండి.',
    formName: 'ఫిర్యాదుదారుని పేరు',
    formEmail: 'ఇమెయిల్ చిరునామా',
    formLoc: 'సంఘటన స్థలం',
    formCat: 'సంఘటన వర్గం',
    formDesc: 'వివరణాత్మక వర్ణన',
    btnBackChat: 'చాట్‌కి తిరిగి వెళ్లండి',
    btnProceed: 'డాక్యుమెంట్‌కి కొనసాగండి',
    btnCancel: 'రద్దు చేయండి',
    mockName: 'రాహుల్ కుమార్',
    mockLoc: 'సెంట్రల్ మార్కెట్ సెక్టార్ 12',
    mockDesc: 'నేను నడుచుకుంటూ వెళుతుండగా సెంట్రల్ మార్కెట్ ఎలక్ట్రానిక్స్ షాప్ ఏరియా సమీపంలో నిన్న సాయంత్రం 6:00 గంటల ప్రాంతంలో నా నల్లటి iPhone 13 (128GB) దొంగిలించబడింది.',
    catOptions: ['దొంగతనం / దోపిడీ', 'మొబైల్/పరికరం దొంగిలించబడింది', 'సైబర్ క్రైమ్', 'దాడి'],
    defaultCat: 'మొబైల్/పరికరం దొంగిలించబడింది',
    // Auth UI
    authPhoneTab: '📱 ఫోన్‌తో లాగిన్',
    authEmailTab: '✉️ ఇమెయిల్‌తో లాగిన్',
    authPhoneLabel: 'ఫోన్ నంబర్',
    authPhonePlaceholder: '10-అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
    authSendOTP: 'OTP పంపండి',
    authOTPLabel: 'OTP నమోదు చేయండి',
    authOTPPlaceholder: '6-అంకెల OTP',
    authVerifyOTP: 'ధృవీకరించి లాగిన్ చేయండి',
    authResendOTP: 'OTP మళ్ళీ పంపండి',
    authNameLabel: 'పూర్తి పేరు',
    authEmailLabel: 'ఇమెయిల్ చిరునామా',
    authPasswordLabel: 'పాస్‌వర్డ్',
    authLoginBtn: 'లాగిన్',
    authRegisterBtn: 'ఖాతా సృష్టించండి',
    authSwitchToRegister: 'ఖాతా లేదా? ఇక్కడ నమోదు చేయండి',
    authSwitchToLogin: 'ఇప్పటికే ఖాతా ఉందా? ఇక్కడ లాగిన్ చేయండి',
    authOTPSent: '✅ OTP పంపబడింది! మీ ఫోన్ తనిఖీ చేయండి.',
    authSuccess: '✅ విజయవంతంగా లాగిన్ అయ్యారు!',
    authTrackPhone: 'ఫోన్ OTP ద్వారా ట్రాక్ చేయండి'
  }
};

const t = (key) => i18n[appState.lang][key];

// ================= View Content Generation =================

// Chatbot view and related functions have been removed


const views = {
  home: () => `
    <div class="view-enter home-view">
      <div class="hero-section glass-panel">
        <h1 class="hero-title">${t('heroTitle')}</h1>
        <p class="hero-subtitle">${t('heroSub')}</p>
        
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" onclick="window.startNewComplaint()">
            ${t('btnStart')}
          </button>
          <button class="btn btn-outline btn-lg" onclick="window.navigateTo('status')">
            ${t('btnTrack')}
          </button>
        </div>
        
        <div class="trust-badges">
          <div class="badge"><i class="ph-fill ph-lock-key"></i> 256-bit Secure</div>
          <div class="badge"><i class="ph-fill ph-robot"></i> AI Powered</div>
          <div class="badge"><i class="ph-fill ph-translate"></i> Multi-lingual</div>
        </div>
      </div>

      <div class="features-grid mt-4">
        <div class="feature-card glass-panel text-center">
          <i class="ph-duotone ph-microphone-stage feature-icon text-accent"></i>
          <h3>${t('featVoice')}</h3>
          <p class="text-muted">${t('featVoiceSub')}</p>
        </div>
        <div class="feature-card glass-panel text-center">
          <i class="ph-duotone ph-file-text feature-icon text-accent"></i>
          <h3>${t('featAuto')}</h3>
          <p class="text-muted">${t('featAutoSub')}</p>
        </div>
        <div class="feature-card glass-panel text-center">
          <i class="ph-duotone ph-handshake feature-icon text-accent"></i>
          <h3>Anonymous Option</h3>
          <p class="text-muted">Report sensitive issues safely with our secure channels.</p>
        </div>
      </div>
    </div>
  `,

  chatbot: () => `
    <div class="view-enter chat-view h-100 flex-col">
      <div class="chat-header glass-panel">
        <div class="ai-avatar">AI</div>
        <div>
          <h3>AI Complaint Assistant</h3>
          <span class="status online text-accent" id="chat-typing-status">â—� Online</span>
        </div>
      </div>
      
      <div class="chat-messages glass-panel" id="chatWindow">
        ${renderChatMessages()}
      </div>

      <div class="chat-input-area glass-panel">
        <input type="text" placeholder="${t('chatInput')}" class="chat-input" id="chatInput" onkeypress="window.checkChatEnter(event)">
        <button class="btn-icon text-muted" title="Voice Input (Mic)" onclick="window.toggleFieldVoiceRec('chatInput')" id="mic-chatInput">
            <i class="ph-fill ph-microphone"></i>
        </button>
        <button class="btn btn-primary" onclick="window.simulateAiFinish()">
          ${t('nextStep')} <i class="ph-bold ph-arrow-right"></i>
        </button>
      </div>
    </div>
  `,

  form: () => {
    // Determine input values (translate mock data if unmodified)
    let nm = appState.complaintData.name;
    let em = appState.complaintData.email || '';
    let lc = appState.complaintData.location;
    let ct = appState.complaintData.incidentType;
    let ds = appState.complaintData.description;
    
    if (!appState.complaintData.incidentType) {
        ct = t('defaultCat'); // Only keep the default category selection fallback
    }

    const catOptionsHTML = t('catOptions').map(opt => 
        `<option value="${opt}" ${ct === opt ? 'selected' : ''}>${opt}</option>`
    ).join('');

    return `
    <div class="view-enter form-view">
      <div class="glass-panel form-container mx-auto">
        <div class="form-header text-center mb-4">
          <i class="ph-duotone ph-clipboard-text text-accent mb-2" style="font-size: 3rem;"></i>
          <h2>${t('formTitle')}</h2>
          <p class="text-muted">${t('formSub')}</p>
        </div>

        <form class="complaint-form" id="cForm" oninput="appState.complaintData.isModified = true;">
          <div class="form-group grid-2">
            <div>
              <div class="flex justify-between items-center mb-1">
                  <label style="margin-bottom:0;">${t('formName')}</label>
              </div>
              <div class="input-wrapper valid">
                <i class="ph ph-user"></i>
                <input type="text" id="form-name" value="${nm}" required>
                <i class="ph-fill ph-check-circle validation-icon"></i>
              </div>
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                  <label style="margin-bottom:0;">${t('formEmail')}</label>
              </div>
              <div class="input-wrapper valid">
                <i class="ph ph-envelope"></i>
                <input type="email" id="form-email" value="${em}">
                <i class="ph-fill ph-check-circle validation-icon"></i>
              </div>
            </div>
          </div>
          
          <div class="form-group grid-2">
            <div>
              <div class="flex justify-between items-center mb-1">
                  <label style="margin-bottom:0;">${t('formLoc')}</label>
              </div>
              <div class="input-wrapper valid">
                <i class="ph ph-map-pin"></i>
                <input type="text" id="form-location" value="${lc}" required>
                <i class="ph-fill ph-check-circle validation-icon"></i>
              </div>
            </div>
            <div>
              <label style="margin-bottom:4px; display:block;">${t('formCat')}</label>
              <div class="input-wrapper valid">
                <i class="ph ph-warning-circle"></i>
                <select id="form-category" required>
                  ${catOptionsHTML}
                </select>
                <i class="ph-fill ph-check-circle validation-icon"></i>
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="flex justify-between items-center mb-1">
                <label style="margin-bottom:0;">${t('formDesc')}</label>
                <button type="button" class="btn-icon text-muted" id="mic-form-description" onclick="window.toggleFieldVoiceRec('form-description')" title="Voice Dictation">
                    <i class="ph-fill ph-microphone"></i>
                </button>
            </div>
            <textarea id="form-description" rows="4" required>${ds}</textarea>
          </div>

          <div class="form-actions mt-4 flex justify-between">
            <button type="button" class="btn btn-outline" onclick="window.navigateTo('home')">${t('btnCancel')}</button>
            <button type="button" class="btn btn-primary" onclick="window.proceedToReview()">${t('btnProceed')}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  },

  review: () => `
    <div class="view-enter review-view flex gap-4">
      <div class="document-wrapper glass-panel flex-1">
        <div class="doc-header flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h2 class="font-bold">First Information Report (Draft)</h2>
            <p class="text-sm text-muted">Govt. Police Department - e-FIR System</p>
          </div>
          <div class="stamp-placeholder text-accent text-sm border border-accent p-2 rounded">
            UNVERIFIED DRAFT
          </div>
        </div>
        
        <div class="doc-body text-sm leading-relaxed mb-4" id="fir-document-body">
          <p><strong>To,</strong><br>The Station House Officer (SHO),<br>Central Police Station.</p>
          <br>
          <p><strong>Subject:</strong> Complaint regarding incident of ${appState.complaintData.incidentType}.</p>
          <br>
          <p>Respected Sir/Madam,</p>
          <p>I, <strong>${appState.complaintData.name}</strong>${appState.complaintData.email ? ` (Email: ${appState.complaintData.email})` : ''}, am writing to formally file a complaint regarding an incident of ${appState.complaintData.incidentType} that occurred at <strong>${appState.complaintData.location}</strong>.</p>
          <p id="review-description">${appState.complaintData.description}</p>
          <p>I humbly request you to register an FIR and investigate the matter at the earliest.</p>
          <br>
          <p><strong>Yours faithfully,</strong><br>${appState.complaintData.name}<br>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="alert-box mb-4 flex gap-2 items-center text-sm">
          <i class="ph-fill ph-info text-accent"></i>
          <p>By submitting, you declare that the above information is true to the best of your knowledge.</p>
        </div>

        <div class="form-actions mt-4 flex justify-between">
          <button type="button" class="btn btn-outline" onclick="window.navigateTo('form')">Edit Details</button>
          <button type="button" class="btn btn-primary submit-btn pulse-glow" onclick="window.submitComplaint()">
            <i class="ph-bold ph-paper-plane-right"></i> Submit Official FIR
          </button>
        </div>
      </div>

      <!-- AI Agent Sidebar -->
      <div class="glass-panel" style="width: 300px; display: flex; flex-direction: column;">
          <div class="flex items-center gap-2 mb-4">
              <div class="ai-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">AI</div>
              <h3 class="text-sm">AI Legal Agent</h3>
          </div>
          <p class="text-xs text-muted mb-4">I can help you make your report sound more professional and legally accurate.</p>
          <button class="btn btn-outline btn-sm w-full mb-2" id="btn-ai-enhance" onclick="window.enhanceWithAI()" style="font-size: 0.8rem;">
              <i class="ph ph-magic-wand"></i> Make Official
          </button>
          <div id="ai-agent-status" class="text-xs text-accent text-center mt-2" style="display:none;">
              <i class="ph ph-spinner spinner"></i> Thinking...
          </div>
      </div>
    </div>
  `,

  success: () => `
    <div class="view-enter success-view flex-col items-center justify-center text-center h-100">
      <div class="success-icon-wrapper mb-4">
        <div class="checkmark-circle">
          <i class="ph-bold ph-check text-success"></i>
        </div>
      </div>
      
      <h1 class="font-bold text-2xl mb-2 text-gradient">Complaint Submitted Successfully!</h1>
      <p class="text-muted max-w-md mx-auto mb-4">Your e-FIR has been securely registered in the police database. You will receive SMS updates on the registered mobile number.</p>
      
      <div class="ticket-id glass-panel p-4 mb-4">
        <span class="text-sm text-muted block mb-1">Complaint / FIR Registration Number</span>
        <span class="text-xl font-bold tracking-widest text-accent" id="generated-id">FIR-8920-2026</span>
      </div>

      <div class="flex gap-3 justify-center">
        <button class="btn btn-outline" onclick="window.navigateTo('home')">
          <i class="ph ph-house"></i> Home
        </button>
        <button class="btn btn-primary shadow-glow">
          <i class="ph ph-download-simple"></i> Download PDF
        </button>
      </div>
    </div>
  `,

  status: () => `
    <div class="view-enter status-view">
        <div class="glass-panel form-container mx-auto mt-4 text-center">
            <i class="ph-duotone ph-magnifying-glass text-accent mb-2" style="font-size: 3rem;"></i>
            <h2 class="mb-2">${t('trackTitle')}</h2>
            <p class="text-muted mb-4">${t('trackSub')}</p>

            <div class="input-wrapper mb-4 text-left">
              <i class="ph ph-file-text"></i>
              <input type="text" id="status-id-input" placeholder="e.g. FIR-1234-2026" class="chat-input" style="border-radius:var(--radius-sm); border:1px solid var(--glass-border);">
            </div>

            <button class="btn btn-primary mb-4 w-full" onclick="window.checkStatus()">
                ${t('trackBtn')}
            </button>

            ${!appState.user ? `
            <div class="divider mb-4" style="display: flex; align-items: center; text-align: center; color: var(--text-muted); font-size: 0.75rem;">
                <span style="flex: 1; height: 1px; background: var(--glass-border); margin: 0 10px;"></span>
                OR
                <span style="flex: 1; height: 1px; background: var(--glass-border); margin: 0 10px;"></span>
            </div>

            <button class="btn btn-outline mb-4 w-full" onclick="window.navigateTo('login', { redirect: 'status' })">
                <i class="ph ph-sign-in"></i> Login to View History
            </button>
            ` : `
            <div id="user-complaints-list" class="mt-4 text-left">
                <h3 class="text-sm font-bold mb-2 text-accent">Your Complaints</h3>
                <div id="complaints-items" class="flex flex-col gap-2">
                    <div class="text-xs text-muted"><i class="ph ph-spinner spinner"></i> Loading your history...</div>
                </div>
            </div>
            `}

            <div id="status-result" class="glass-panel p-4 text-left mt-4" style="display:none; border-color:var(--accent); background:rgba(56, 189, 248, 0.05);">
                <div class="flex items-center gap-2 mb-2">
                    <i class="ph-fill ph-info text-accent text-xl"></i>
                    <strong class="text-xl">Update found</strong>
                </div>
                <p class="text-muted">${t('trackStatusResult')}</p>
                <p class="text-sm mt-2">Last updated: Today at ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="mt-4">
                <button class="btn btn-outline" onclick="window.navigateTo('home')">Back Home</button>
            </div>
        </div>
    </div>
  `,

  login: () => `
    <div class="view-enter login-view flex-col items-center justify-center h-100">
      <div class="glass-panel auth-card mx-auto mt-4">
        
        <!-- Header -->
        <div class="auth-header text-center mb-4">
          <img src="/police-logo.svg" alt="AP Police Logo" style="height:56px; width:auto; margin-bottom:0.75rem; filter: drop-shadow(0 0 10px rgba(56,189,248,0.4));">
          <h2 class="font-bold" style="font-size:1.4rem;">Police<span class="text-accent">AI</span> Assist</h2>
          <p class="text-muted text-sm">Secure Authentication Portal</p>
        </div>

        <!-- Email/Password Auth Section -->
        <div id="email-auth-section">
          ${appState.loginMode === 'register' ? `
          <div class="form-group">
            <label class="text-sm text-muted mb-1 block">${t('authNameLabel')}</label>
            <div class="input-wrapper">
              <i class="ph ph-user"></i>
              <input type="text" id="auth-name" placeholder="${t('authNameLabel')}" required>
            </div>
          </div>` : ''}
          
          <div class="form-group">
            <label class="text-sm text-muted mb-1 block">${t('authPhoneLabel')}</label>
            <div class="input-wrapper">
              <i class="ph ph-phone"></i>
              <input type="tel" id="auth-phone" placeholder="${t('authPhonePlaceholder')}" maxlength="10">
            </div>
          </div>
          
          <div class="form-group">
            <label class="text-sm text-muted mb-1 block">${t('authEmailLabel')}</label>
            <div class="input-wrapper">
              <i class="ph ph-envelope"></i>
              <input type="email" id="auth-email" placeholder="${t('authEmailLabel')}" required>
            </div>
          </div>

          <div class="form-group">
            <label class="text-sm text-muted mb-1 block">${t('authPasswordLabel')}</label>
            <div class="input-wrapper">
              <i class="ph ph-lock"></i>
              <input type="password" id="auth-password" placeholder="${t('authPasswordLabel')} (min 6 chars)" minlength="6" required>
            </div>
          </div>

          <div id="auth-msg" class="auth-msg" style="display:none;"></div>

          <button id="btn-auth" class="btn btn-primary mt-2" onclick="window.handleAuth(event)" style="width:100%;">
            <i class="ph-bold ph-sign-in"></i>
            ${appState.loginMode === 'login' ? t('authLoginBtn') : t('authRegisterBtn')}
          </button>

          <p class="text-sm text-muted text-center mt-3">
            <span class="text-accent" style="cursor:pointer; text-decoration:underline;" onclick="window.toggleLoginMode()">
              ${appState.loginMode === 'login' ? t('authSwitchToRegister') : t('authSwitchToLogin')}
            </span>
          </p>
        </div>

      </div>
    </div>
  `
};

window.toggleLoginMode = () => {
    appState.loginMode = (appState.loginMode === 'login' ? 'register' : 'login');
    window.navigateTo('login');
};

// ================== AUTH HELPERS ==================

const showAuthMsg = (msg, isError = false) => {
    const el = document.getElementById('auth-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = isError ? '#f87171' : '#34d399';
};

const renderChatMessages = () => {
  return appState.chatMessages.map(msg => `
    <div class="message ${msg.sender === 'ai' ? 'ai-msg' : 'user-msg'}">
      <div class="avatar">
        <i class="ph-fill ${msg.sender === 'ai' ? 'ph-robot' : 'ph-user'}"></i>
      </div>
      <div class="bubble">
        ${msg.text}
      </div>
    </div>
  `).join('');
};

window.startNewComplaint = () => {
    if (!appState.user) {
        appState.redirectAfterLogin = 'form';
        window.navigateTo('login');
        return;
    }
    // Reset Data but skip chat
    appState.complaintData = {
        name: appState.user.name,
        location: '',
        incidentType: 'Theft / Robbery',
        description: '',
        isModified: false
    };
    window.navigateTo('form');
};

window.sendChatMessage = () => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    appState.chatMessages.push({ sender: 'user', text: text });
    input.value = '';
    
    appState.complaintData.description = text;
    appState.complaintData.isModified = true;
    
    reRenderChat();
    
    const typingStatus = document.getElementById('chat-typing-status');
    if (typingStatus) typingStatus.innerText = '... Typing';
    
    setTimeout(() => {
        appState.chatMessages.push({ sender: 'ai', text: t('chatAiExtracting') });
        if (typingStatus) typingStatus.innerText = 'â—� Online';
        reRenderChat();
    }, 1500);
};

window.checkChatEnter = (e) => {
    if (e.key === 'Enter') {
        window.sendChatMessage();
    }
};

// ================= Router & App Logic =================
const appContent = document.getElementById('app-content');

window.changeLanguage = (langCode) => {
  if (i18n[langCode]) {
    // If we're on the form view, save what user typed before re-rendering
    if (appState.currentView === 'form') {
      const nameInput = document.getElementById('form-name');
      const emailInput = document.getElementById('form-email');
      const locInput = document.getElementById('form-location');
      const catInput = document.getElementById('form-category');
      const descInput = document.getElementById('form-description');

      if (nameInput) appState.complaintData.name = nameInput.value;
      if (emailInput) appState.complaintData.email = emailInput.value;
      if (locInput) appState.complaintData.location = locInput.value;
      if (catInput) appState.complaintData.incidentType = catInput.value;
      if (descInput) appState.complaintData.description = descInput.value;
    }

    appState.lang = langCode;
    const navHelpElement = document.getElementById('nav-ai-help');
    if (navHelpElement) navHelpElement.innerText = t('navHelp');
    
    // Always re-render the current view to show the new language, except maybe review/success.
    appContent.innerHTML = views[appState.currentView]();
    if (appState.currentView === 'chatbot') scrollToBottom();
  }
};

window.navigateTo = (viewName) => {
  if (!views[viewName]) return;

  // Login Wall Check: Protected views
  const protectedViews = ['chatbot', 'form', 'review', 'success'];
  if (protectedViews.includes(viewName) && !appState.user) {
    appState.redirectAfterLogin = viewName;
    viewName = 'login';
  }

  appState.currentView = viewName;
  appContent.innerHTML = views[viewName]();
  window.scrollTo(0, 0);

  // Re-initialize any logic needed for specific views
  if (viewName === 'success') {
    document.getElementById('generated-id').innerText = appState.complaintId || 'FIR-' + Math.floor(1000 + Math.random() * 9000) + '-2026';
  } else if (viewName === 'chatbot') {
    scrollToBottom();
  } else if (viewName === 'status' && appState.user) {
    window.loadUserComplaints();
  }
};

window.startNewComplaint = () => {
    // Reset Chat State
    appState.chatMessages = [
        { sender: 'ai', text: t('chatAiMsg1') }
    ];
    window.navigateTo('chatbot');
};

// ================= Chat Interaction Logic =================
window.checkChatEnter = (e) => {
    if (e.key === 'Enter') {
        window.sendChatMessage();
    }
};

window.sendChatMessage = () => {
    const input = document.getElementById('chatInput');
// sendChatMessage was moved up to avoid confusion
};

const reRenderChat = () => {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.innerHTML = renderChatMessages();
        scrollToBottom();
    }
};

const scrollToBottom = () => {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
};

// ================= Voice Recognition Logic =================
let recognition = null;
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const targetFieldId = appState.isRecording;
        if (targetFieldId) {
            const inputEl = document.getElementById(targetFieldId);
            if (inputEl) {
                if (targetFieldId === 'chatInput' || targetFieldId === 'form-description') {
                    inputEl.value = inputEl.value ? inputEl.value + ' ' + transcript : transcript;
                } else {
                    inputEl.value = transcript;
                }
                
                if (targetFieldId.startsWith('form-')) {
                   appState.complaintData.isModified = true;
                }
            }
            if (targetFieldId === 'chatInput') {
                window.sendChatMessage();
            }
        }
        
        appState.isRecording = false;
        renderGlobalMicState();
    };

    recognition.onerror = () => {
        appState.isRecording = false;
        renderGlobalMicState();
    };
    
    recognition.onend = () => {
        appState.isRecording = false;
        renderGlobalMicState();
    }
}

window.toggleFieldVoiceRec = (fieldId) => {
    if (!recognition) {
        alert("Microphone feature is not supported in this browser environment.");
        return;
    }
    
    if (appState.isRecording === fieldId) {
        recognition.stop();
        appState.isRecording = false;
    } else if (appState.isRecording) {
        recognition.stop();
        setTimeout(() => startRecForField(fieldId), 300);
        return;
    } else {
        startRecForField(fieldId);
    }
    renderGlobalMicState();
};

const startRecForField = (fieldId) => {
    appState.isRecording = fieldId;
    if (appState.lang === 'hi') recognition.lang = 'hi-IN';
    else if (appState.lang === 'te') recognition.lang = 'te-IN';
    else recognition.lang = 'en-US';
    
    recognition.start();
    renderGlobalMicState();
};

const renderGlobalMicState = () => {
    // Collect all mic button IDs
    const micIds = ['mic-chatInput', 'mic-form-name', 'mic-form-location', 'mic-form-description'];
    
    micIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            // "mic-form-name" maps to field "form-name"
            const fieldId = id.replace('mic-', '');
            if (appState.isRecording === fieldId) {
                btn.classList.add('text-success', 'pulse-glow');
                btn.classList.remove('text-muted');
            } else {
                btn.classList.remove('text-success', 'pulse-glow');
                btn.classList.add('text-muted');
            }
        }
    });
}


// ================= Forms & Status Tracking =================
window.simulateAiFinish = () => {
    // Navigate straight to the form view after chatbot interaction
    window.navigateTo('form');
};

window.proceedToReview = () => {
  const nameInput = document.getElementById('form-name');
  const emailInput = document.getElementById('form-email');
  const locInput = document.getElementById('form-location');
  const catInput = document.getElementById('form-category');
  const descInput = document.getElementById('form-description');

  if (nameInput) appState.complaintData.name = nameInput.value;
  if (emailInput) appState.complaintData.email = emailInput.value;
  if (locInput) appState.complaintData.location = locInput.value;
  if (catInput) appState.complaintData.incidentType = catInput.value;
  if (descInput) appState.complaintData.description = descInput.value;
  
  window.navigateTo('review');
};

// ================= n8n Webhook - Submit FIR =================
const submitFIR = async (formData) => {
    const webhookUrl = 'https://vanam777.app.n8n.cloud/webhook/submit-fir';

    const firData = {
        name: formData.name,              // e.g., "Rahul Sharma"
        email: formData.email,            // e.g., "user@example.com"
        phone: formData.phone,            // e.g., "9876543210"
        incident_type: formData.type,     // e.g., "Theft"
        date: formData.date,              // e.g., "2026-03-21"
        time: formData.time,              // e.g., "14:30"
        location: formData.location,      // e.g., "Hyderabad"
        description: formData.description, // e.g., "Phone stolen at station"
        language: formData.language        // "English", "Hindi", or "Telugu"
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', // Bypass CORS browser blocks
            headers: { 'Content-Type': 'text/plain' }, // Use text/plain for no-cors
            body: JSON.stringify(firData)
        });

        // With no-cors, response is "opaque" meaning we can't read response.status or body,
        // but the request IS sent to the server.
        console.log('✅ Webhook request sent to n8n');
    } catch (error) {
        console.error('❌ Submission to webhook failed:', error);
    }
};

window.submitComplaint = async () => {
  const btn = document.querySelector('.submit-btn');
  if (btn) {
    btn.innerHTML = '<i class="ph-bold ph-spinner spinner"></i> Submitting...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
  }
  
  const firId = 'FIR-' + Math.floor(1000 + Math.random() * 9000) + '-2026';
  const userId = appState.user ? appState.user.uid : 'anonymous';
  
  // Save complaint to Firestore
  const complaintData = {
      firId: firId,
      userId: userId,
      userName: appState.complaintData.name,
      userEmail: appState.complaintData.email,
      location: appState.complaintData.location,
      type: appState.complaintData.incidentType,
      description: appState.complaintData.description,
      status: 'Under Review',
      timestamp: new Date().toISOString()
  };

  // Build n8n-compatible FIR payload and send via submitFIR
  const now = new Date();
  await submitFIR({
      name: appState.complaintData.name,
      email: appState.complaintData.email,
      phone: appState.user ? (appState.user.phone || '') : '',
      type: appState.complaintData.incidentType,
      date: now.toISOString().split('T')[0],          // e.g. "2026-03-21"
      time: now.toTimeString().slice(0, 5),            // e.g. "13:05"
      location: appState.complaintData.location,
      description: appState.complaintData.description,
      language: appState.lang === 'hi' ? 'Hindi' : appState.lang === 'te' ? 'Telugu' : 'English'
  });

  // Ensure UI progresses even if Firebase is hanging offline
  setTimeout(() => {
      if (appState.currentView !== 'success') {
          appState.complaintId = firId;
          window.navigateTo('success');
      }
  }, 1500);

  setDoc(doc(db, "complaints", firId), complaintData)
      .then(() => {
          console.log("FIR Saved to DB:", firId);
          if (appState.currentView !== 'success') {
              appState.complaintId = firId;
              window.navigateTo('success');
          }
      })
      .catch((error) => {
          console.error("Database Error (Ignored for demo):", error);
      });
}

window.enhanceWithAI = () => {
    const status = document.getElementById('ai-agent-status');
    const btn = document.getElementById('btn-ai-enhance');
    const descEl = document.getElementById('review-description');
    
    if (status) status.style.display = 'block';
    if (btn) btn.disabled = true;

    setTimeout(() => {
        const original = appState.complaintData.description;
        const enhanced = `OFFICIAL STATEMENT: The complainant, ${appState.complaintData.name}, reports a case of ${appState.complaintData.incidentType} at ${appState.complaintData.location}. DETAILED ACCOUNT: ${original}. ACTION REQUESTED: Immediate registration of FIR under relevant sections of the IPC and initiation of investigation.`;
        
        appState.complaintData.description = enhanced;
        if (descEl) descEl.innerText = enhanced;
        if (status) status.innerHTML = '<i class="ph ph-check-circle text-success"></i> Report Enhanced!';
    }, 2000);
};

// ================= Tracking & Search =================
window.checkStatus = async () => {
    const id = document.getElementById('status-id-input').value.trim();
    const resultDiv = document.getElementById('status-result');
    if (!id) return;

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="text-center py-4"><i class="ph-bold ph-spinner spinner"></i> Searching...</div>`;

    try {
        // Query Firestore for specific FIR ID
        const q = query(collection(db, "complaints"), where("firId", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            resultDiv.innerHTML = `<div class="text-red-400 p-2">❌ No complaint found with ID: ${id}</div>`;
        } else {
            const data = querySnapshot.docs[0].data();
            resultDiv.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                    <i class="ph-fill ph-info text-accent text-xl"></i>
                    <strong class="text-xl">Update found</strong>
                </div>
                <div class="text-sm border-l-2 border-accent pl-3 mt-2">
                    <div class="font-bold">Status: <span class="text-accent">${data.status || 'Under Investigation'}</span></div>
                    <div class="mt-1 text-xs text-muted">Type: ${data.incidentType}</div>
                    <div class="text-xs text-muted">Location: ${data.location}</div>
                </div>
                <p class="text-xs mt-4 text-muted">Last updated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            `;
        }
    } catch (e) {
        console.error("Firestore Search Error (checkStatus):", e);
        resultDiv.innerHTML = `<div class="text-red-400 p-2 text-xs">Error searching database. Please try again.</div>`;
    }
};

window.loadUserComplaints = async () => {
    const listDiv = document.getElementById('complaints-items');
    if (!listDiv || !appState.user) return;

    try {
        // Find complaints by phone or UID
        const q = query(collection(db, "complaints"), where("userId", "==", appState.user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listDiv.innerHTML = `<div class="text-xs text-muted">No complaints found linked to your account.</div>`;
        } else {
            listDiv.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const item = document.createElement('div');
                item.className = 'glass-panel p-3 text-xs flex justify-between items-center transition-all hover:border-accent cursor-pointer';
                item.innerHTML = `
                    <div>
                        <div class="font-bold text-accent">${data.firId || 'FIR-PENDING'}</div>
                        <div class="text-muted">${data.incidentType} - ${data.location}</div>
                    </div>
                    <div class="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-accent font-bold">
                        ${data.status || 'Active'}
                    </div>
                `;
                item.onclick = () => {
                    document.getElementById('status-id-input').value = data.firId || '';
                    window.checkStatus();
                };
                listDiv.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Firestore History Error (loadUserComplaints):", e);
        listDiv.innerHTML = `<div class="text-xs text-red-400">Error loading history.</div>`;
    }
};

// Boot the app
window.updateNavAuth = () => {
    const authContainer = document.getElementById('nav-auth-container');
    if (!authContainer) return;
    if (appState.user) {
        authContainer.innerHTML = `
            <div class="user-profile flex items-center gap-2" style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; border: 1px solid var(--glass-border); cursor: pointer;" onclick="window.logout()" title="Click to Logout">
                <i class="ph-fill ph-user-circle text-accent" style="font-size: 1.5rem"></i>
                <span class="text-sm font-medium d-mobile-none">${appState.user.name.split(' ')[0]}</span>
            </div>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="btn btn-outline" onclick="window.navigateTo('login')">
              <i class="ph ph-sign-in"></i> <span class="d-mobile-none">Login</span>
            </button>
        `;
    }
};

window.handleAuth = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const emailEl = document.getElementById('auth-email');
    const passwordEl = document.getElementById('auth-password');
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    
    if (!emailEl || !passwordEl) return;
    
    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();
    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    const btn = document.getElementById('btn-auth');
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph-bold ph-spinner spinner"></i> Processing...'; btn.disabled = true; }

    if (appState.loginMode === 'register') {
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                // Save additional details to Firestore - separate try/catch
                try {
                    await setDoc(doc(db, 'users', user.uid), {
                        userId: user.uid,
                        name: name,
                        email: email,
                        phone: phone,
                        createdAt: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.warn('⚠️ Firestore sync failed during registration:', dbErr);
                }
                
                appState.user = { name: name || 'User', email: email, uid: user.uid, phone: phone };
                showAuthMsg(t('authSuccess'));
                window.updateNavAuth();
                setTimeout(() => {
                    if (appState.redirectAfterLogin) {
                        const target = appState.redirectAfterLogin;
                        appState.redirectAfterLogin = null;
                        if (target === 'chatbot' || target === 'form') window.startNewComplaint();
                        else window.navigateTo(target);
                    } else {
                        window.navigateTo('home');
                    }
                }, 800);
            })
            .catch((error) => {
                if (auth.currentUser) {
                    appState.user = { name: name || 'User', email: auth.currentUser.email, uid: auth.currentUser.uid, phone: '' };
                    window.updateNavAuth();
                    window.navigateTo('home');
                    return;
                }
                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') msg = '❌ This email is already registered. Please Login instead.';
                if (error.code === 'auth/weak-password') msg = '❌ Password should be at least 6 characters.';
                showAuthMsg(msg, true);
                if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
            });
    } else {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                appState.user = { name: user.displayName || 'User', email: user.email, uid: user.uid, phone: '' };
                window.updateNavAuth();
                
                // Background: fetch actual name from Firestore
                getDoc(doc(db, 'users', user.uid)).then(docSnap => {
                    if (docSnap.exists()) {
                        appState.user.name = docSnap.data().name;
                        appState.user.phone = docSnap.data().phone || '';
                        window.updateNavAuth();
                    }
                }).catch(() => {});

                showAuthMsg(t('authSuccess'));
                setTimeout(() => {
                    if (appState.redirectAfterLogin) {
                        const target = appState.redirectAfterLogin;
                        appState.redirectAfterLogin = null;
                        if (target === 'chatbot' || target === 'form') window.startNewComplaint();
                        else window.navigateTo(target);
                    } else {
                        window.navigateTo('home');
                    }
                }, 800);
            })
            .catch((error) => {
                if (auth.currentUser) {
                    appState.user = { name: auth.currentUser.displayName || 'User', email: auth.currentUser.email, uid: auth.currentUser.uid, phone: '' };
                    window.updateNavAuth();
                    window.navigateTo('home');
                    return;
                }
                let msg = '❌ Login failed. Please check your credentials.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    msg = "❌ Invalid email or password. If you haven't registered yet, click 'Register here'.";
                }
                showAuthMsg(msg, true);
                if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
            });
    }
};

window.logout = () => {
    if(confirm('Are you sure you want to logout?')) {
        signOut(auth).then(() => {
            appState.user = null;
            window.updateNavAuth();
            window.navigateTo('home');
        });
    }
};

window.updateNavAuth();
window.navigateTo('home');
