# JONGTAO Design System
## Impeccable Design Principles Applied

> A luxury bar & lounge booking system built with **Impeccable Design** principles for perfect consistency, accessibility, and user experience.

---

## 🎨 Design Philosophy

This design system follows **Impeccable Design** principles:

1. **8px Grid System** - All spacing follows a predictable 8px rhythm
2. **Perfect Typography Scale** - Clear hierarchy with mathematical precision
3. **Consistent Spacing** - Every element aligns to the grid
4. **Accessibility First** - WCAG compliant focus states and contrast
5. **Smooth Interactions** - Thoughtful animations and transitions
6. **Mobile-First** - Responsive design that works everywhere

---

## 📏 Spacing System (8px Grid)

All spacing follows an 8px grid for perfect alignment:

```css
--spacing-1: 4px   /* 0.5 × 8px */
--spacing-2: 8px   /* 1 × 8px */
--spacing-3: 12px  /* 1.5 × 8px */
--spacing-4: 16px  /* 2 × 8px */
--spacing-5: 20px  /* 2.5 × 8px */
--spacing-6: 24px  /* 3 × 8px */
--spacing-8: 32px  /* 4 × 8px */
--spacing-10: 40px /* 5 × 8px */
--spacing-12: 48px /* 6 × 8px */
--spacing-16: 64px /* 8 × 8px */
--spacing-20: 80px /* 10 × 8px */
--spacing-24: 96px /* 12 × 8px */
```

### Usage Example
```html
<div class="p-4 mt-6 mb-8">
  <!-- Padding: 16px, Margin-top: 24px, Margin-bottom: 32px -->
</div>
```

---

## 🔤 Typography Scale

Perfect ratios for readable hierarchy:

| Class | Size | Usage |
|-------|------|-------|
| `font-xs` | 12px | Captions, labels |
| `font-sm` | 14px | Small text, metadata |
| `font-base` | 16px | Body text (default) |
| `font-lg` | 18px | Emphasized body |
| `font-xl` | 20px | Subheadings |
| `font-2xl` | 24px | Section titles |
| `font-3xl` | 30px | Card headers |
| `font-4xl` | 36px | Page headers |
| `font-5xl` | 48px | Hero text |

### Font Weights
- `font-thin` (100) - Decorative
- `font-light` (300) - Light emphasis
- `font-normal` (400) - Body text
- `font-medium` (500) - Subtle emphasis
- `font-semibold` (600) - Headings
- `font-bold` (700) - Strong emphasis
- `font-extrabold` (800) - Branding
- `font-black` (900) - Maximum impact

### Line Heights
- `leading-none` (1) - Tight headlines
- `leading-tight` (1.25) - Headings
- `leading-normal` (1.5) - Body text
- `leading-relaxed` (1.625) - Comfortable reading
- `leading-loose` (2) - Maximum spacing

---

## 🎨 Color Palette

### Primary Colors (Luxury Bar Theme)
```css
--primary: #D4A574;        /* Amber Gold (Whiskey/Cognac) */
--secondary: #8B2942;      /* Deep Wine Red */
--accent-gold: #D4AF37;    /* Pure Gold */
--accent-neon: #C8A882;    /* Soft Gold Glow */
```

### Semantic Colors
```css
--success: #10B981;  /* Green */
--warning: #F59E0B;  /* Orange */
--danger: #EF4444;   /* Red */
--info: #3B82F6;     /* Blue */
```

### Text Hierarchy
```css
--text-main: #FAFAFA;      /* Primary text */
--text-muted: #A1A1AA;     /* Secondary text */
--text-dim: #71717A;       /* Tertiary text */
--text-dimmer: #52525B;    /* Subtle text */
```

---

## 📐 Border Radius (4px based)

```css
--radius-sm: 4px     /* Small elements */
--radius-DEFAULT: 8px /* Default */
--radius-md: 12px    /* Cards */
--radius-lg: 16px    /* Large cards */
--radius-xl: 20px    /* Containers */
--radius-2xl: 24px   /* Modals */
--radius-3xl: 32px   /* Hero elements */
--radius-full: 9999px /* Pills, circles */
```

---

## 🎭 Component Examples

### Buttons
```html
<!-- Primary Button -->
<button class="btn btn-primary">
  จองโต๊ะ
</button>

<!-- Ghost Button -->
<button class="btn btn-ghost">
  ยกเลิก
</button>

<!-- Outline Button -->
<button class="btn btn-outline">
  ดูรายละเอียด
</button>
```

### Cards
```html
<div class="glass-card p-6 rounded-lg">
  <h3 class="font-2xl font-bold mb-4">Card Title</h3>
  <p class="text-muted">Card content...</p>
</div>
```

### Badges
```html
<span class="badge badge-success">ยืนยันแล้ว</span>
<span class="badge badge-warning">รอยืนยัน</span>
<span class="badge badge-danger">ยกเลิก</span>
```

---

## ⚡ Animation & Transitions

### Timing Functions
```css
--transition-fast: 150ms    /* Quick feedback */
--transition-base: 250ms    /* Standard */
--transition-slow: 400ms    /* Smooth transitions */
--transition-slower: 600ms  /* Dramatic effects */
```

### Easing Curves
```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)          /* Standard */
--ease-in: cubic-bezier(0.4, 0, 1, 1)                /* Accelerate */
--ease-out: cubic-bezier(0, 0, 0.2, 1)               /* Decelerate */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55) /* Bounce */
--ease-elastic: cubic-bezier(0.175, 0.885, 0.32, 1.275) /* Elastic */
```

### Animation Classes
```html
<div class="animate-fade">Fade in</div>
<div class="animate-fade-up">Slide up</div>
<div class="animate-scale">Scale in</div>
<div class="animate-float">Floating effect</div>
```

---

## 🎯 Z-Index Scale

Predictable layering system:

```css
--z-0: 0
--z-10: 10
--z-20: 20
--z-30: 30
--z-40: 40
--z-50: 50
--z-dropdown: 1000
--z-sticky: 1020
--z-fixed: 1030
--z-modal-backdrop: 1040
--z-modal: 1050
--z-popover: 1060
--z-tooltip: 1070
--z-notification: 1080
```

---

## ♿ Accessibility

### Focus States
All interactive elements have WCAG-compliant focus indicators:

```css
.btn:focus-visible {
  outline: 2px solid var(--accent-gold);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
}
```

### Touch Targets
Minimum 44px height for all interactive elements (iOS/Android guidelines)

```css
.btn {
  min-height: 44px;
  padding: var(--spacing-3) var(--spacing-6);
}
```

### Screen Reader Support
```html
<button class="btn">
  <span class="sr-only">Close modal</span>
  ×
</button>
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
@media (max-width: 768px) { /* Tablet */ }
@media (max-width: 480px) { /* Mobile */ }
```

---

## 🚀 Utility Classes

### Spacing
```html
<div class="m-4">Margin: 16px</div>
<div class="mt-6">Margin-top: 24px</div>
<div class="p-8">Padding: 32px</div>
<div class="px-4 py-6">Padding: 16px 24px</div>
```

### Layout
```html
<div class="flex flex-center gap-4">Flex center with gap</div>
<div class="grid grid-cols-3 gap-6">Grid 3 columns</div>
```

### Display
```html
<div class="block">Block</div>
<div class="hidden">Hidden</div>
<div class="opacity-50">50% opacity</div>
```

### Typography
```html
<p class="text-center font-bold text-lg">Centered bold text</p>
<p class="truncate">Truncated text...</p>
<p class="line-clamp-2">Max 2 lines...</p>
```

### Transitions
```html
<div class="transition hover:scale-105">Hover to scale</div>
<div class="transition-fast hover:-translate-y-1">Quick lift</div>
```

---

## 🎓 Best Practices

### DO ✅
- Use 8px spacing multiples (4, 8, 12, 16, 24, 32, 40, 48, 64...)
- Apply consistent border radius from the scale
- Use semantic color variables
- Add focus states to all interactive elements
- Test with keyboard navigation
- Ensure 44px minimum touch targets
- Use utility classes for consistency

### DON'T ❌
- Use arbitrary pixel values (e.g., 13px, 27px)
- Mix different spacing systems
- Use inline styles for spacing/colors
- Forget focus states
- Use low contrast text
- Make touch targets too small
- Duplicate CSS unnecessarily

---

## 📚 Resources

- **Design Token Reference**: See `src/styles/main.css` (:root section)
- **Component Library**: All components follow these guidelines
- **Impeccable.style**: Original design principles inspiration
- **WCAG 2.1 AA**: Accessibility compliance standard

---

## 🛠️ Development Workflow

1. **Start with utilities**: Use spacing/typography utilities first
2. **Create components**: Build reusable components when needed
3. **Test responsiveness**: Check mobile, tablet, desktop
4. **Verify accessibility**: Keyboard navigation and screen readers
5. **Optimize performance**: Minimize CSS, use CSS variables

---

**Last Updated**: March 2026
**Version**: 1.0.0
**Design System**: Impeccable Design Principles
