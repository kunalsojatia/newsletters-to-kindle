# 📬 Send Newsletters to Kindle Automatically

A zero-maintenance Google Apps Script that automatically converts your Gmail newsletters into perfectly formatted, distraction-free EPUBs and sends them to your Kindle. 

If you love reading newsletters but hate reading them on a glowing phone screen or a cluttered Kindle library, this script is for you.

## ✨ Features

- **Distraction-Free Reading:** Strips out messy HTML, buttons, and trackers.
- **Accidental-Click Prevention:** Converts all hyperlinks into plain text so you don't accidentally open the Kindle web browser while reading.
- **Perfect Images:** Fixes the "squished image" bug common to Kindle emails by surgically removing hardcoded HTML dimensions.
- **Chronological Sorting:** Automatically names files `YYYY-MM-DD - [Newsletter Name]` so your Kindle library naturally sorts them by date.
- **Dual-Label State Management:** Keeps your newsletters marked as *Unread* in your Gmail inbox for later viewing, but tags them as processed so they are never sent to your Kindle twice.

---

## 🚀 Setup Instructions

### 1. Prepare Your Amazon Account
Before setting up the script, you must tell Amazon to accept emails from your Gmail address.
1. Go to Amazon.com -> **Account & Lists** -> **Content & Devices**.
2. Click the **Preferences** tab, then click **Personal Document Settings**.
3. Under **Approved Personal Document E-mail List**, add the Gmail address you will be using to run this script.
4. Note your **Send-to-Kindle E-Mail address** (it ends in `@kindle.com`). You will need this later.

### 2. Set Up the Google Apps Script
1. Go to [script.google.com](https://script.google.com/) and click **New Project**.
2. Name the project something like "Kindle Newsletter Sender".
3. Delete any default code in the editor, and paste the entire contents of the `Code.gs` file from this repository.

### 3. Add the "Cheerio" Library (Required)
This script uses the Cheerio library to parse and clean the HTML.
1. On the left sidebar of the Apps Script editor, click the `+` icon next to **Libraries**.
2. Paste this exact Script ID: `1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0`
3. Click **Look up**, select the latest version, and click **Add**.

### 4. Configure Script Properties
Instead of hardcoding your email addresses and labels, we use Script Properties.
1. Click the **Project Settings** (gear icon) on the left sidebar.
2. Scroll down to **Script Properties** and click **Add script property**.
3. Add the following three properties exactly as written:
   * **Property:** `GMAIL_INCLUDE_LABEL` | **Value:** `KindleNewsletter` *(or whatever label you use for incoming newsletters)*
   * **Property:** `GMAIL_EXCLUDE_LABEL` | **Value:** `SentToKindle` *(the script will apply this label after processing)*
   * **Property:** `RECIPIENT_EMAIL` | **Value:** `your_kindle_email@kindle.com`
4. Click **Save script properties**.

### 5. Setup Gmail Labels
Go to your Gmail inbox and ensure you have a label created that exactly matches the `GMAIL_INCLUDE_LABEL` you set in step 4. 
*Tip: Set up a Gmail Filter to automatically apply this label to incoming newsletters (e.g., emails from Substack, Morning Brew, etc.).*

### 6. Initial Run & Authorization
1. Go back to the Apps Script **Editor** (`< >` icon).
2. Select the `sendToKindle` function from the dropdown at the top and click **Run**.
3. **Authorization Required:** Google will ask you to review permissions. 
   * Click **Review permissions** -> Select your Google Account.
   * You will see a scary "Google hasn’t verified this app" warning. This is normal because you wrote the code yourself.
   * Click **Advanced** -> **Go to Kindle Newsletter Sender (unsafe)**.
   * Click **Allow** to let the script read your emails and send emails on your behalf.
4. If you had an unread newsletter with your label in Gmail, it should now be on its way to your Kindle!

### 7. Automate It (Setup Triggers)
To make this run automatically in the background:
1. Click the **Triggers** icon (the alarm clock) on the left sidebar.
2. Click **Add Trigger** in the bottom right corner.
3. Configure it as follows:
   * Choose which function to run: `sendToKindle`
   * Select event source: `Time-driven`
   * Select type of time based trigger: `Minutes timer` or `Hour timer`
   * Select time interval: `Every 15 minutes` (or whatever frequency you prefer).
4. Click **Save**.

🎉 **You're done!** Your newsletters will now automatically flow to your Kindle.

---

## 🛠️ How it Works Day-to-Day
1. An email arrives in your inbox and Gmail automatically applies your Include Label (`KindleNewsletter`).
2. The Apps Script runs in the background. It finds the email, packages it into a beautifully formatted EPUB, and emails it to Amazon.
3. The script applies the Exclude Label (`SentToKindle`) to the email thread so it is never processed again.
4. The email remains marked as **Unread** in your Gmail inbox, so you can still read it on your computer or phone if you want to!
