# Responsive Design Manual Verification Checklist

**Date**: 2025-12-27  
**Target**: https://gsg-mecm  
**Tester**: _____________

---

## Devices to Test

- [ ] **Desktop**: 1920×1080 (Chrome/Edge)
- [ ] **Laptop**: 1366×768 (Chrome/Edge)
- [ ] **Tablet**: iPad or equivalent (768×1024)
- [ ] **Mobile**: iPhone or Android (375×812 / 360×640)

---

## Pages to Verify

### 1. Login Page (`/login`)

| Device | No Overflow | Footer Visible | Inputs Usable | Button Clickable |
|--------|-------------|----------------|---------------|------------------|
| Desktop | ☐ | ☐ | ☐ | ☐ |
| Laptop | ☐ | ☐ | ☐ | ☐ |
| Tablet | ☐ | ☐ | ☐ | ☐ |
| Mobile | ☐ | ☐ | ☐ | ☐ |

---

### 2. Admin Dashboard (`/app/admin`)

| Device | No Overflow | Footer Visible | Tables Usable | Menu Works |
|--------|-------------|----------------|---------------|------------|
| Desktop | ☐ | ☐ | ☐ | ☐ |
| Laptop | ☐ | ☐ | ☐ | ☐ |
| Tablet | ☐ | ☐ | ☐ | ☐ |
| Mobile | ☐ | ☐ | ☐ | ☐ |

**Notes**:
- Tables should scroll horizontally or stack on mobile
- Menu should be hamburger on small screens

---

### 3. Employee Dashboard (`/app/employee`)

| Device | No Overflow | Footer Visible | Create Ticket Works |
|--------|-------------|----------------|---------------------|
| Desktop | ☐ | ☐ | ☐ |
| Laptop | ☐ | ☐ | ☐ |
| Tablet | ☐ | ☐ | ☐ |
| Mobile | ☐ | ☐ | ☐ |

---

### 4. Session Expiry Modal

| Device | Fits Screen | Buttons Tappable | Countdown Visible |
|--------|-------------|------------------|-------------------|
| Desktop | ☐ | ☐ | ☐ |
| Laptop | ☐ | ☐ | ☐ |
| Tablet | ☐ | ☐ | ☐ |
| Mobile | ☐ | ☐ | ☐ |

---

## Critical Checks

### Horizontal Overflow Test
**Method**: Open DevTools Console
```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```
**Expected**: `false` (no overflow)

| Page | Desktop | Laptop | Tablet | Mobile |
|------|---------|--------|--------|--------|
| /login | ☐ | ☐ | ☐ | ☐ |
| /app/admin | ☐ | ☐ | ☐ | ☐ |
| /app/employee | ☐ | ☐ | ☐ | ☐ |

---

### Footer Text Wrapping
Footer text: _"Created by IT4U • v1.4 • 2025 • Crafted by Seetharam © GeoSoftGlobal-Surtech International"_

| Device | Wraps Correctly | No Clipping | Centered |
|--------|-----------------|-------------|----------|
| Desktop | ☐ | ☐ | ☐ |
| Laptop | ☐ | ☐ | ☐ |
| Tablet | ☐ | ☐ | ☐ |
| Mobile | ☐ | ☐ | ☐ |

---

## Browser Testing Matrix

| Browser | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Chrome | ☐ | ☐ | ☐ |
| Edge | ☐ | ☐ | ☐ |
| Firefox | ☐ | ☐ | ☐ |
| Safari | N/A | ☐ | ☐ |

---

## Issues Found

| Issue | Page | Device | Severity | Screenshot |
|-------|------|--------|----------|------------|
| | | | H/M/L | |
| | | | H/M/L | |
| | | | H/M/L | |

---

## Sign-Off

**All viewports validated**: ☐ YES / ☐ NO  
**Blockers found**: ☐ YES / ☐ NO  
**Ready for release**: ☐ YES / ☐ NO

**Tester Signature**: _____________  
**Date**: _____________

---

## Notes
