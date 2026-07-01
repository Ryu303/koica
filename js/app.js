/**
 * KOICA Exhibition Hall Audio Guide - SPA Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let guidesData = [];
  let currentLanguage = localStorage.getItem('koica_lang') || 'ko';
  let currentTrackId = null;
  let isPlaying = false;

  // --- SPEECH SYNTHESIS (TTS) STATE ---
  let currentUtterance = null;
  const synth = window.speechSynthesis;
  let isTTSActive = false;
  window.activeUtterances = []; // To prevent browser garbage collection bug

  // --- DOM ELEMENTS ---
  const backBtn = document.getElementById('back-btn');
  const headerTitle = document.getElementById('header-title-text');
  const langBtn = document.getElementById('lang-btn');
  const currentFlag = document.getElementById('current-flag');
  const currentLangText = document.getElementById('current-lang-text');
  const langDropdown = document.getElementById('lang-dropdown');
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  const guideListContainer = document.getElementById('guide-list-container');
  
  const shareBtn = document.getElementById('share-btn');
  const earphoneAlertText = document.getElementById('earphone-alert-text');
  const audioElement = document.getElementById('audio-element');
  const detailTitle = document.getElementById('detail-title');
  const detailParagraphs = document.getElementById('detail-paragraphs');
  const topBtn = document.getElementById('top-btn');
  
  const prevBtn = document.getElementById('prev-btn');
  const listBtn = document.getElementById('list-btn');
  const nextBtn = document.getElementById('next-btn');
  const navPrevText = document.getElementById('nav-prev-text');
  const navNextText = document.getElementById('nav-next-text');

  // --- SVG ICONS CONSTANTS ---
  const ICONS = {
    headset: `
      <svg class="headset-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
      </svg>
    `,
    readAloud: `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        <path d="m15 5 3 3"></path>
        <path d="M7 8.5c.5-.5 1.5-.5 2 0s.5 1.5 0 2-1.5.5-2 0-.5-1.5 0-2z" fill="currentColor" opacity="0.3"></path>
      </svg>
    `,
    flagKr: `
      <svg width="20" height="14" viewBox="-72 -48 144 96">
        <rect x="-72" y="-48" width="144" height="96" fill="#ffffff" stroke="#cccccc" stroke-width="0.5"/>
        <g transform="rotate(-33.69)">
          <rect x="-24" y="-24" width="48" height="24" fill="#cd2e3a"/>
          <rect x="-24" y="0" width="48" height="24" fill="#0047a0"/>
          <circle cx="-12" cy="0" r="12" fill="#0047a0"/>
          <circle cx="12" cy="0" r="12" fill="#cd2e3a"/>
        </g>
        <!-- Geon (top-left) -->
        <g transform="rotate(-33.69)">
          <g transform="translate(-42,0)">
            <rect x="-2" y="-12" width="4" height="24" fill="#000000"/>
            <rect x="2" y="-12" width="4" height="24" fill="#000000"/>
            <rect x="6" y="-12" width="4" height="24" fill="#000000"/>
          </g>
          <!-- Gon (bottom-right) -->
          <g transform="translate(42,0)">
            <rect x="-6" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="-6" y="1" width="4" height="11" fill="#000000"/>
            <rect x="-2" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="-2" y="1" width="4" height="11" fill="#000000"/>
            <rect x="2" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="2" y="1" width="4" height="11" fill="#000000"/>
          </g>
        </g>
        <!-- Gam (top-right) -->
        <g transform="rotate(33.69)">
          <g transform="translate(42,0)">
            <rect x="-6" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="-6" y="1" width="4" height="11" fill="#000000"/>
            <rect x="-2" y="-12" width="4" height="24" fill="#000000"/>
            <rect x="2" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="2" y="1" width="4" height="11" fill="#000000"/>
          </g>
          <!-- Ri (bottom-left) -->
          <g transform="translate(-42,0)">
            <rect x="-6" y="-12" width="4" height="24" fill="#000000"/>
            <rect x="-2" y="-12" width="4" height="11" fill="#000000"/>
            <rect x="-2" y="1" width="4" height="11" fill="#000000"/>
            <rect x="2" y="-12" width="4" height="24" fill="#000000"/>
          </g>
        </g>
      </svg>
    `,
    flagUs: `
      <svg width="20" height="14" viewBox="0 0 30 20">
        <rect width="30" height="20" fill="#3C3B6E"/>
        <g fill="#B22234">
          <rect y="1.54" width="30" height="1.54"/>
          <rect y="4.62" width="30" height="1.54"/>
          <rect y="7.69" width="30" height="1.54"/>
          <rect y="10.77" width="30" height="1.54"/>
          <rect y="13.85" width="30" height="1.54"/>
          <rect y="16.92" width="30" height="1.54"/>
        </g>
        <g fill="#ffffff">
          <rect width="30" height="1.54"/>
          <rect y="3.08" width="30" height="1.54"/>
          <rect y="6.15" width="30" height="1.54"/>
          <rect y="9.23" width="30" height="1.54"/>
          <rect y="12.31" width="30" height="1.54"/>
          <rect y="15.38" width="30" height="1.54"/>
          <rect y="18.46" width="30" height="1.54"/>
        </g>
        <rect width="12" height="10.77" fill="#3C3B6E"/>
        <circle cx="2" cy="2" r="0.5" fill="#fff"/>
        <circle cx="4" cy="2" r="0.5" fill="#fff"/>
        <circle cx="6" cy="2" r="0.5" fill="#fff"/>
        <circle cx="8" cy="2" r="0.5" fill="#fff"/>
        <circle cx="10" cy="2" r="0.5" fill="#fff"/>
        <circle cx="3" cy="4" r="0.5" fill="#fff"/>
        <circle cx="5" cy="4" r="0.5" fill="#fff"/>
        <circle cx="7" cy="4" r="0.5" fill="#fff"/>
        <circle cx="9" cy="4" r="0.5" fill="#fff"/>
        <circle cx="2" cy="6" r="0.5" fill="#fff"/>
        <circle cx="4" cy="6" r="0.5" fill="#fff"/>
        <circle cx="6" cy="6" r="0.5" fill="#fff"/>
        <circle cx="8" cy="6" r="0.5" fill="#fff"/>
        <circle cx="10" cy="6" r="0.5" fill="#fff"/>
        <circle cx="3" cy="8" r="0.5" fill="#fff"/>
        <circle cx="5" cy="8" r="0.5" fill="#fff"/>
        <circle cx="7" cy="8" r="0.5" fill="#fff"/>
        <circle cx="9" cy="8" r="0.5" fill="#fff"/>
      </svg>
    `
  };

  // --- INIT APPLICATION ---
  async function init() {
    setupLanguageSelector();
    setupEventHandlers();
    
    // Fetch data from the API server
    try {
      const response = await fetch('data/guides.json');
      if (!response.ok) throw new Error('Failed to load data');
      guidesData = await response.json();
      
      // Setup initial page view based on hash URL
      handleRouting();
    } catch (error) {
      console.error('Error fetching guides:', error);
      guideListContainer.innerHTML = `
        <div style="padding: 40px text-align: center; color: var(--text-light);">
          <p>데이터를 불러오지 못했습니다.</p>
          <p style="font-size: 13px; margin-top: 10px;">서버 연결을 확인해 주세요.</p>
        </div>
      `;
    }
  }

  // --- LANGUAGE SELECTOR ---
  function setupLanguageSelector() {
    // Set UI language from state
    updateLanguageUI(currentLanguage);

    // Toggle dropdown
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = langBtn.getAttribute('aria-expanded') === 'true';
      langBtn.setAttribute('aria-expanded', !isExpanded);
      langDropdown.classList.toggle('hidden');
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      langBtn.setAttribute('aria-expanded', 'false');
      langDropdown.classList.add('hidden');
    });

    // Handle selection
    const dropdownItems = langDropdown.querySelectorAll('li');
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const lang = item.getAttribute('data-lang');
        if (lang !== currentLanguage) {
          currentLanguage = lang;
          localStorage.setItem('koica_lang', lang);
          
          // Update selected style in dropdown
          dropdownItems.forEach(li => li.classList.remove('active'));
          item.classList.add('active');
          
          updateLanguageUI(lang);
          
          // Re-render contents
          if (currentTrackId !== null) {
            renderDetailView(currentTrackId);
          } else {
            renderListView();
          }
        }
      });
    });
  }

  function updateLanguageUI(lang) {
    if (lang === 'ko') {
      currentFlag.innerHTML = ICONS.flagKr;
      currentLangText.textContent = '한국어';
      earphoneAlertText.textContent = '전시관 내에서는 이어폰을 이용해주세요.';
    } else {
      currentFlag.innerHTML = ICONS.flagUs;
      currentLangText.textContent = 'English';
      earphoneAlertText.textContent = 'Please use earphones inside the exhibition hall.';
    }
  }

  // --- ROUTING / SPA SWITCHING ---
  function handleRouting() {
    const hash = window.location.hash;
    const match = hash.match(/^#guide-(\d+)$/);

    if (match) {
      const trackId = parseInt(match[1], 10);
      const trackExists = guidesData.some(g => g.id === trackId);
      
      if (trackExists) {
        showView('detail');
        renderDetailView(trackId);
      } else {
        // Fallback to list if track doesn't exist
        window.location.hash = '';
      }
    } else {
      showView('list');
      renderListView();
      // Pause audio and stop TTS when returning to list
      audioElement.pause();
      stopTrack();
    }
  }

  function showView(viewName) {
    if (viewName === 'list') {
      listView.classList.remove('hidden');
      detailView.classList.add('hidden');
      backBtn.classList.add('hidden');
      currentTrackId = null;
    } else {
      listView.classList.add('hidden');
      detailView.classList.remove('hidden');
      backBtn.classList.remove('hidden');
    }
    // Scroll mobile canvas to top on view switch
    window.scrollTo(0, 0);
  }

  // --- RENDERING ---
  function renderListView() {
    guideListContainer.innerHTML = '';
    
    guidesData.forEach(guide => {
      const card = document.createElement('a');
      card.href = `#guide-${guide.id}`;
      card.className = 'guide-card';
      
      const title = guide.title[currentLanguage] || guide.title['ko'];
      
      card.innerHTML = `
        <div class="card-left">
          ${ICONS.headset}
          <span class="track-number-badge">${guide.number}</span>
        </div>
        <div class="card-title">${title}</div>
        <div class="card-right">
          ${ICONS.readAloud}
        </div>
      `;
      
      guideListContainer.appendChild(card);
    });
  }

  function renderDetailView(id) {
    currentTrackId = id;
    // Stop any active TTS reading from previous track
    stopTrack();

    const guide = guidesData.find(g => g.id === id);
    if (!guide) return;

    // 1. Text Details
    const title = guide.title[currentLanguage] || guide.title['ko'];
    detailTitle.textContent = title;
    
    const paragraphs = guide.content[currentLanguage] || guide.content['ko'] || [];
    detailParagraphs.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');

    // 2. Audio Setup
    // Only change audio source if it's different to prevent resetting playback
    const targetAudioSrc = guide.audio;
    const currentAudioSrc = audioElement.getAttribute('src');
    
    if (currentAudioSrc !== targetAudioSrc) {
      audioElement.src = targetAudioSrc;
      audioElement.load();
    }

    // 3. Navigation Buttons (Prev / Next)
    const prevIndex = guidesData.findIndex(g => g.id === id) - 1;
    const nextIndex = guidesData.findIndex(g => g.id === id) + 1;

    if (prevIndex >= 0) {
      prevBtn.disabled = false;
      prevBtn.onclick = () => {
        window.location.hash = `#guide-${guidesData[prevIndex].id}`;
      };
    } else {
      prevBtn.disabled = true;
      prevBtn.onclick = null;
    }

    if (nextIndex < guidesData.length) {
      nextBtn.disabled = false;
      nextBtn.onclick = () => {
        window.location.hash = `#guide-${guidesData[nextIndex].id}`;
      };
    } else {
      nextBtn.disabled = true;
      nextBtn.onclick = null;
    }
  }

  // --- SPEECH SYNTHESIS (TTS) HELPERS ---
  function speakTrack() {
    synth.cancel(); // Stop any active speech

    const guide = guidesData.find(g => g.id === currentTrackId);
    if (!guide) return;

    // Use child-friendly descriptions we created
    const paragraphs = guide.content[currentLanguage] || [];
    if (paragraphs.length === 0) return;

    // Calculate which paragraph to start speaking from based on audio time seek point
    let startIndex = 0;
    const duration = audioElement.duration || 10;
    const currentTime = audioElement.currentTime || 0;

    if (duration > 0 && currentTime > 0) {
      const fraction = currentTime / duration;
      startIndex = Math.floor(fraction * paragraphs.length);
      if (startIndex >= paragraphs.length) {
        startIndex = paragraphs.length - 1;
      }
      if (startIndex < 0) {
        startIndex = 0;
      }
    }

    const textToSpeak = paragraphs.slice(startIndex).join(' ');
    if (!textToSpeak.trim()) return;

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = currentLanguage === 'ko' ? 'ko-KR' : 'en-US';

    // Prevent Chrome/Edge garbage collection bug by storing a strong reference in window
    window.activeUtterances.push(currentUtterance);

    // Prioritize high-quality natural/neural voices for a realistic sound
    const voices = synth.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(currentUtterance.lang));
    let voice = null;

    if (langVoices.length > 0) {
      // 1. Try Microsoft Edge/Chrome Natural or Online voices
      voice = langVoices.find(v => v.name.includes('Natural') || v.name.includes('Online'));
      
      // 2. Try Google's enhanced voices
      if (!voice) {
        voice = langVoices.find(v => v.name.includes('Google'));
      }
      
      // 3. Fallback to standard system voice
      if (!voice) {
        voice = langVoices[0];
      }
    }

    if (voice) {
      currentUtterance.voice = voice;
    }

    // Set voice properties: child-friendly tone and adjusted speed (0.15 slower)
    currentUtterance.rate = currentLanguage === 'ko' ? 1.10 : 1.00; // Decreased by 0.15 from 1.25 / 1.15
    currentUtterance.pitch = 1.1; // slightly higher pitch for friendly tone

    currentUtterance.onstart = () => {
      isTTSActive = true;
      audioElement.volume = 0.15; // Duck background sound (chimes/tada)
    };

    currentUtterance.onend = () => {
      // Clean up reference
      const index = window.activeUtterances.indexOf(currentUtterance);
      if (index > -1) {
        window.activeUtterances.splice(index, 1);
      }

      if (isTTSActive) {
        isTTSActive = false;
        audioElement.volume = 1.0; // Restore volume
        audioElement.pause(); // Pause BGM when story is finished
      }
    };

    currentUtterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      
      const index = window.activeUtterances.indexOf(currentUtterance);
      if (index > -1) {
        window.activeUtterances.splice(index, 1);
      }

      isTTSActive = false;
      audioElement.volume = 1.0;
    };

    synth.speak(currentUtterance);
  }

  function pauseTrack() {
    if (isTTSActive && synth.speaking && !synth.paused) {
      synth.pause();
    }
  }

  // Handle play-resume
  function resumeTrack() {
    if (synth.paused) {
      synth.resume();
    } else if (!synth.speaking) {
      speakTrack();
    }
  }

  function stopTrack() {
    synth.cancel();
    window.activeUtterances = []; // Clean up GC helper array
    isTTSActive = false;
    audioElement.volume = 1.0;
  }

  // --- EVENT HANDLERS ---
  function setupEventHandlers() {
    // Back Button in header
    backBtn.addEventListener('click', () => {
      window.location.hash = '';
    });

    // Hash change routing
    window.addEventListener('hashchange', handleRouting);

    // List button in footer detail navigation
    listBtn.addEventListener('click', () => {
      window.location.hash = '';
    });

    // Scroll to top button
    topBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // Share Button Handler
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: detailTitle.textContent,
        text: `KOICA Exhibition Hall Audio Guide - ${detailTitle.textContent}`,
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback: Copy to clipboard
          await navigator.clipboard.writeText(window.location.href);
          showToast(
            currentLanguage === 'ko' 
              ? '링크가 클립보드에 복사되었습니다.' 
              : 'Link copied to clipboard.'
          );
        }
      } catch (err) {
        console.error('Error sharing:', err);
      }
    });

    // Audio element player state synchronization with TTS
    audioElement.addEventListener('play', () => {
      resumeTrack();
    });

    audioElement.addEventListener('pause', () => {
      pauseTrack();
    });

    audioElement.addEventListener('seeked', () => {
      // Restart speech from beginning if they scrub the player to a new position
      if (!audioElement.paused) {
        speakTrack();
      }
    });

    // Safely reset voice if user unloads or navigates away
    window.addEventListener('beforeunload', () => {
      synth.cancel();
    });
  }

  // --- UTILS ---
  function showToast(message) {
    // Remove existing toast if any
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Force reflow
    toast.offsetHeight;

    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Run initial loading
  init();
});
