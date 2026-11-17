# m.o brand adaptation QA

final result: passed

## Target and scope

Source visual truth: the two user-supplied images in this conversation: the 1280 × 720 “GOOD COMPANY” brand board and the 1280 × 853 three-phone app mockup. Adapt their visual language to the existing version 11 host workspace and personal reply card. This is a responsive web adaptation, not a recreation of the phone bezels or a new social/profile product. The current data, authenticated host boundary, scoped guest replies and demo isolation remain authoritative.

Implementation: `/demo` and `/reply?demo=inez` in the Cloud browser at the directly served task preview. `sites-preview` relay failed with “timed out waiting for relay readiness”; terminal.local returned “No approved upstream IPv4 address.” Used the portable runtime's direct Cloud localhost preview to complete browser QA. This preview is not published.

## Rendered evidence

- `/workspace/shared/mo-host-desktop.jpg`: final host overview, approximately 1171 × 760 browser viewport at default zoom. Cream canvas, plum rounded heading, brick-red primary actions, yellow selected navigation and pale blue coordination callout.
- `/workspace/shared/mo-host-mobile.jpg`: full-page host capture at 400 CSS px width, 591 CSS px visible height, native narrow Chrome window at 125% zoom. No horizontal overflow: scrollWidth equals innerWidth (400). Bottom navigation stays available while the workspace selector exposes the remaining sections.
- `/workspace/shared/mo-guest-mobile.jpg`: full-page narrow invitation capture after declining and preview-saving. Confirmed attendance was also tested afterwards; contribution fields return.

Comparison uses the supplied brand board and phone interiors as the visual target alongside the browser-rendered desktop and narrow-page captures. Device chrome, differing event data, desktop navigation and demo labels are intentional differences. The source mobile screens have different content and a taller viewport; no pixel-equality claim is made.

Capture dimensions: desktop JPEG 1171 × 736; mobile host full-page JPEG 310 × 1884; mobile guest full-page JPEG 310 × 995. The browser export downsizes long captures; mobile captures are not 1:1 CSS-pixel images. The final guest controls after the checkbox correction are in `/workspace/shared/mo-guest-final.jpg`. Source and rendered captures are compared for visual direction, hierarchy and responsive behavior with these density/state differences acknowledged.

## Five fidelity surfaces

- Typography: self-hosted Nunito Sans 400/600/700/800/900, rounded heavy plum headings and compact wordmark; clear sans body type and larger mobile form inputs. The exact source font was not supplied; Nunito Sans is the chosen open-font match. OFL license included.
- Layout: photo-led event card, compact status counts, readable panels and clear bring-list action. Desktop retains the useful host rail. Mobile stacks the event card, preserves all sections through the selector and adds three working bottom shortcuts. Guest card remains a narrow invitation with attendance choices and progressive contribution details.
- Tokens: cream `#faf4eb`, plum `#39202f`, brick red `#ab3529`, yellow `#f9df8b`, pale blue `#dce4f2`. Focus indicators, hover, selected and disabled states remain visible.
- Images: generated editorial dinner photograph of Black friends in a warm outdoor setting; inspected before use, locally served with correct dimensions and object-fit cropping. Decorative, empty-alt image with visible host inspiration label; it does not assert that the pictured people are actual guests. Reused across the two related event flows; no third-party tracking image requests.
- Content: “Good company starts here,” “Here’s what’s coming together,” and “Saved you a seat” apply the reference voice to existing coordination. Demo labels remain conspicuous; no invented actual attendees, automated communications or new social actions.

## Iteration history

1. Initial desktop and mobile review: the event name appeared redundantly in the host heading and photo card, and the fictional SIMULATION prefix dominated the card. Replaced the overview subtitle with one short line and removed the prefix from the display-only demo event title; the explicit demo banner remains.
2. Focused guest control review: global label direction put the reconfirmation checkbox above its text. Set the scoped inline-check label to row and restored an 18px checkbox. Attendance selections, contribution visibility and preview-save feedback were retested.
3. Final capture: desktop event card and 400 CSS px host page reviewed again. No actionable P0/P1/P2 layout or interaction findings remain for this adaptation.

## Interactions and errors

- Review bring list opens Food & backups.
- Mobile Guests and Overview shortcuts change sections.
- Host Save changes shows “Demo only”; no live save.
- Guest Can’t make it hides contribution fields; I’m in restores them.
- Guest Save my reply shows temporary demo completion.
- Both demos remain labeled fictional and isolated.
- Browser error logs inspected: extension metadata errors only (`chrome-extension://...`), no application-origin errors observed. The Sites terminal.local preview relay failed to initialize (no approved upstream IPv4); the actual Cloud browser was verified directly against the same local server at 127.0.0.1:4173. No hosted preview or live audience change was used as a workaround. DevTools is disabled by browser policy; did not change that policy. Narrow-window checks used ordinary window resizing and browser zoom.
- npm test and npm run check pass; production build passes with the existing large-chunk advisory.

## Remaining limits

Hosted multi-account authentication and guest reachability are still rollout gates described in ACCESS-REVIEW.md. This visual change does not change the live Site audience, publish a version, or alter server authorization. Testing on physical iOS/Android devices remains follow-up polish.
