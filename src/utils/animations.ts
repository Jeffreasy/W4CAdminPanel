import gsap from 'gsap'

/**
 * Animatietype om te gebruiken voor verschillende elementen
 */
type AnimationType =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'fadeOut'
  | 'scale'
  | 'popIn'
  | 'slideUp'
  | 'slideDown'
  | 'bounce'
  | 'countUp'
  | 'stagger'
  | 'slideInLeft'
  | 'slideInRight'
  | 'slideInUp'
  | 'slideInDown'
  | 'bounceIn'
  | 'pulse'

/**
 * Opties voor de duur, vertraging en ease
 */
interface AnimationOptions {
  /** De duur van de animatie (default: 0.5) */
  duration?: number
  /** Vertraging voor de animatie begint (default: 0) */
  delay?: number
  /** Te gebruiken ease functie (default: 'power2.out') */
  ease?: string
  /** Additional animation properties */
  [key: string]: any
  staggerAmount?: number
  childAnimation?: AnimationType
  onComplete?: () => void
}

/**
 * Opties specifiek voor staggered animaties
 */
interface StaggerOptions extends AnimationOptions {
  /** Tijd tussen elk element (default: 0.1) */
  staggerAmount?: number
  /** Animatie-type voor de staggered elementen (default: 'fadeInUp') */
  childAnimation?: AnimationType
}

/**
 * Opties specifiek voor nummer animaties
 */
interface CountUpOptions extends AnimationOptions {
  /** Prefix toegevoegd aan het getal (bijv. '€') */
  prefix?: string
  /** Suffix toegevoegd aan het getal (bijv. '%') */
  suffix?: string
  /** Formateer getallen als valuta met decimalen (default: false) */
  isCurrency?: boolean
}

/**
 * Basis animatie functie die gsap.fromTo gebruikt
 */
const animateElement = (
  element: gsap.TweenTarget,
  fromVars: gsap.TweenVars,
  toVars: gsap.TweenVars,
  options: AnimationOptions = {}
): gsap.core.Tween => {
  const { duration = 0.5, delay = 0, ease = 'power2.out', ...restOptions } = options

  return gsap.fromTo(
    element,
    fromVars,
    {
      ...toVars,
      duration,
      delay,
      ease,
      ...restOptions
    }
  )
}

/**
 * Functie om een specifiek animatietype uit te voeren
 */
export const animate = (
  element: gsap.TweenTarget,
  type: AnimationType,
  options: AnimationOptions = {}
): gsap.core.Tween => {
  // Bekijk welk type animatie moet worden gebruikt
  switch (type) {
    case 'fadeIn':
      return animateElement(
        element,
        { opacity: 0 },
        { opacity: 1 },
        options
      )

    case 'fadeInUp':
      return animateElement(
        element,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0 },
        options
      )

    case 'fadeInDown':
      return animateElement(
        element,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0 },
        options
      )

    case 'fadeInLeft':
      return animateElement(
        element,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0 },
        options
      )

    case 'fadeInRight':
      return animateElement(
        element,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0 },
        options
      )

    case 'scale':
      return animateElement(
        element,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1 },
        { ...options, ease: options.ease || 'back.out(1.5)' }
      )

    case 'slideUp':
      return animateElement(
        element,
        { y: '100%' },
        { y: 0 },
        options
      )

    case 'slideDown':
      return animateElement(
        element,
        { y: '-100%' },
        { y: 0 },
        options
      )

    case 'bounce':
      return animateElement(
        element,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1 },
        { ...options, ease: options.ease || 'elastic.out(1, 0.5)' }
      )

    case 'fadeOut':
      return animateElement(
        element,
        { opacity: 1 },
        { opacity: 0 },
        options
      )

    case 'popIn':
      return animateElement(
        element,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1 },
        { ...options, ease: 'back.out(1.7)' }
      )

    case 'slideInLeft':
      return animateElement(
        element,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1 },
        options
      )

    case 'slideInRight':
      return animateElement(
        element,
        { x: 50, opacity: 0 },
        { x: 0, opacity: 1 },
        options
      )

    case 'slideInUp':
      return animateElement(
        element,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1 },
        options
      )

    case 'slideInDown':
      return animateElement(
        element,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1 },
        options
      )

    case 'bounceIn':
      return animateElement(
        element,
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'elastic.out(1, 0.3)' },
        options
      )

    case 'pulse':
      return gsap.to(element, {
        scale: 1.05,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        ...options
      })

    default:
      console.warn(`Animatietype "${type}" is niet gedefinieerd.`)
      return animateElement(
        element,
        { opacity: 0 },
        { opacity: 1 },
        options
      )
  }
}

/**
 * Functie voor staggered animaties (voor lijsten/meerdere elementen)
 */
export const animateStaggered = (
  elements: gsap.TweenTarget,
  options: StaggerOptions = {}
): gsap.core.Timeline => {
  const {
    childAnimation = 'fadeInUp',
    staggerAmount = 0.1,
    duration = 0.4,
    delay = 0,
    ease = 'power2.out',
    ...restOptions
  } = options

  // Bepaal het from/to voor het animatietype
  let fromVars: gsap.TweenVars = { opacity: 0, y: 20 }
  let toVars: gsap.TweenVars = { opacity: 1, y: 0 }

  switch (childAnimation) {
    case 'fadeInLeft':
      fromVars = { opacity: 0, x: -20 }
      toVars = { opacity: 1, x: 0 }
      break
    case 'fadeInRight':
      fromVars = { opacity: 0, x: 20 }
      toVars = { opacity: 1, x: 0 }
      break
    case 'fadeInDown':
      fromVars = { opacity: 0, y: -20 }
      toVars = { opacity: 1, y: 0 }
      break
    case 'scale':
      fromVars = { opacity: 0, scale: 0.9 }
      toVars = { opacity: 1, scale: 1 }
      break
    // fadeInUp is de default
  }

  const tl = gsap.timeline();
  tl.fromTo(
    elements,
    fromVars,
    {
      ...toVars,
      duration,
      stagger: staggerAmount,
      delay,
      ease,
      ...restOptions
    }
  );

  return tl;
}

/**
 * Functie voor het animeren van een nummer dat optelt of aftelt
 */
const animateCountUp = (
  element: gsap.TweenTarget,
  endValue: number,
  options: CountUpOptions = {}
): gsap.core.Tween => {
  const {
    duration = 1.5,
    delay = 0,
    ease = 'power2.out',
    prefix = '',
    suffix = '',
    isCurrency = false,
    ...restOptions
  } = options

  // Reset de tekst naar 0 voordat de animatie start
  if (element instanceof HTMLElement) {
    element.textContent = '0'
  }

  return gsap.fromTo(
    element,
    { textContent: 0 },
    {
      textContent: endValue,
      duration,
      delay,
      ease,
      snap: { textContent: 1 },
      ...restOptions,
      onUpdate: function () {
        if (this.targets()[0]) {
          let value = parseFloat(this.targets()[0].textContent || '0')

          if (isCurrency) {
            this.targets()[0].textContent = `${prefix}${value.toFixed(2)}${suffix}`
          } else {
            this.targets()[0].textContent = `${prefix}${Math.round(value)}${suffix}`
          }
        }
      }
    }
  )
}

/**
 * Dashboard-specifieke animaties
 */
export const dashboardAnimations = {
  // Welcome banner entrance
  welcomeBanner: (element: gsap.TweenTarget) =>
    animate(element, 'fadeInDown', { duration: 0.5, ease: 'power3.out' }),

  // Stats cards with staggered entrance
  statsCards: (elements: gsap.TweenTarget) =>
    animateStaggered(elements, {
      childAnimation: 'scale',
      staggerAmount: 0.1,
      duration: 0.6,
      ease: 'back.out(1.5)'
    }),

  // Stat number counter animation
  statValue: (element: gsap.TweenTarget, value: number, options: CountUpOptions = {}) =>
    animateCountUp(element, value, {
      duration: 1.5,
      delay: 0.3,
      ...options
    }),

  // Table entrance animation
  table: (element: gsap.TweenTarget, delay: number = 0.4) =>
    animate(element, 'fadeInUp', { duration: 0.5, delay, ease: 'power2.out' }),
}

// Functions are already exported above with 'export const' 