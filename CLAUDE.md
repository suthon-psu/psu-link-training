# This is an URL shortener application to use internally in Prince of Songkha University. #
## Overview ##
- Authenticated user can give URL and description to get shorten URL and QR code.
- System shall measure secured level. The level should be simple for general user to have perception whether it is secured to go to that URL.
- When users access shorten URL (via QR code or shared linked), they will be brought to a landing page. The page should display original URL, description, title of page (from system scan), secured level, last update on secured level
- After 3 seconds count down, the landing page will redirect to original URL. (users can stop the redirect process)

## User ##
There are 3 types of user.
- Authenticated Users -- link creation, managment, ownership transfer, stat reports
- Admin Users -- search, view, and disable link by shortCode
- Public Users -- access link from shortCode

## Features ##
- Link can be available for given period of time (startDateTime, endDateTime)
- Generate QR code can be with University Logo or plain QR
- Generate QR code may comes with subtitle

## Non Functional Feature ##
- Cookie Consent

## Code Structure ##
- cln is SPA (with MUIv7, React, Zustand, react-hook-form, zod)
- e2e is end-to-end testing using Playwright
