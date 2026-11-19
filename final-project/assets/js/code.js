function startCountdown(targetTime, titleText, isCountdown = true) {
  const timerDisplay = document.getElementById('timer-display');
  const titleDisplay = document.getElementById('timer-title');

  if (!timerDisplay) {
    return;
  }

  if (titleDisplay && titleText) {
    titleDisplay.textContent = titleText;
  }

  const updateTimer = () => {
    const now = new Date();
    const diff = isCountdown ? targetTime - now : now - targetTime;

    if (diff <= 0 && isCountdown) {
      timerDisplay.textContent = 'Liftoff or in window!';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    timerDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

async function initStarshipTimer() {
  const timerDisplay = document.getElementById('timer-display');
  const titleDisplay = document.getElementById('timer-title');

  if (!timerDisplay) {
    return;
  }

  if (location.protocol === 'file:') {
    const sampleTarget = new Date(Date.now() + (17 * 24 * 60 * 60 * 1000) + (7 * 60 * 60 * 1000) + (57 * 60 * 1000) + (37 * 1000));

    if (titleDisplay) {
      titleDisplay.textContent = 'Next Launch: Sample Starship Mission';
    }

    startCountdown(sampleTarget, 'Next Launch: Sample Starship Mission', true);
    return;
  }

  try {
    const upcomingRes = await fetch('https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=Starship');

    if (!upcomingRes.ok) {
      throw new Error(`Upcoming launch request failed with status ${upcomingRes.status}`);
    }

    const upcomingData = await upcomingRes.json();

    let targetTime;
    let isCountdown = false;

    if (upcomingData.results && upcomingData.results.length > 0) {
      const nextLaunch = upcomingData.results[0];
      targetTime = new Date(nextLaunch.net);

      if (targetTime > new Date()) {
        isCountdown = true;
        if (titleDisplay) titleDisplay.textContent = `Next Launch: ${nextLaunch.name}`;
      }
    }

    if (!isCountdown) {
      const prevRes = await fetch('https://lldev.thespacedevs.com/2.3.0/launches/previous/?search=Starship');

      if (!prevRes.ok) {
        throw new Error(`Previous launch request failed with status ${prevRes.status}`);
      }

      const prevData = await prevRes.json();

      if (prevData.results && prevData.results.length > 0) {
        const lastLaunch = prevData.results[0];
        targetTime = new Date(lastLaunch.net);
        if (titleDisplay) titleDisplay.textContent = `Time Since Last Launch (${lastLaunch.name})`;
      } else {
        timerDisplay.textContent = 'Launch data unavailable.';
        return;
      }
    }

    startCountdown(targetTime, titleDisplay ? titleDisplay.textContent : '', isCountdown);
  } catch (error) {
    console.warn('Falling back to sample launch data because the live API could not be reached:', error);
    const sampleTarget = new Date(Date.now() + (17 * 24 * 60 * 60 * 1000) + (7 * 60 * 60 * 1000) + (57 * 60 * 1000) + (37 * 1000));
    startCountdown(sampleTarget, 'Next Launch: Sample Starship Mission', true);
  }
}

initStarshipTimer();

const launchToTop = document.querySelector('.launch-to-top');

if (launchToTop) {
  let previousScrollY = window.scrollY;

  const updateLaunchButton = () => {
    const scrollY = window.scrollY;
    const isLaunched = launchToTop.classList.contains('is-launched');

    if (isLaunched && scrollY > previousScrollY) {
      launchToTop.classList.remove('is-launched');
    }

    const isAnimating = launchToTop.classList.contains('is-launching')
      || launchToTop.classList.contains('is-departing');
    launchToTop.classList.toggle('is-visible', scrollY > 300 || isAnimating);
    previousScrollY = scrollY;
  };

  window.addEventListener('scroll', updateLaunchButton, { passive: true });
  updateLaunchButton();

  launchToTop.addEventListener('click', () => {
    if (launchToTop.classList.contains('is-launching') || launchToTop.classList.contains('is-departing')) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    launchToTop.classList.add('is-launching');

    const launchAtTop = () => {
      if (window.scrollY > 0) {
        return;
      }

      window.removeEventListener('scroll', launchAtTop);
      launchToTop.classList.remove('is-launching');
      launchToTop.classList.add('is-departing');

      window.setTimeout(() => {
        launchToTop.classList.remove('is-departing');
        launchToTop.classList.add('is-launched');
        updateLaunchButton();
      }, 900);
    };

    window.addEventListener('scroll', launchAtTop, { passive: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    launchAtTop();
  });
}