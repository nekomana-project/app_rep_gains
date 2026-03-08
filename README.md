<div align="center">
  <h1>💪 Gains Tracker</h1>
  <p>A robust, hybrid offline & cloud-synced workout tracking application.</p>

  ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
</div>

<br />

## 📖 About The Project

Gains Tracker is a hybrid mobile application built with React Native and Expo. It is designed to work seamlessly both **offline** (using local device storage) and **online** (with real-time cloud synchronization via Firebase).

Whether you want to keep your data completely private on your phone or sync your gains across multiple devices with a registered account, Gains Tracker has you covered.

## ✨ Features

* **Hybrid Data Management:** * **Offline Mode:** Instantly track workouts using `AsyncStorage` without creating an account.
  * **Cloud Mode:** Securely register an account to sync workouts and custom exercises to Firebase Firestore.
* **Comprehensive Logging:** Track exercises by Sets, Reps, Weight (lbs/kg), or Time (duration in seconds).
* **Smart Daily Stats:** Automatically calculates your total sets and estimated calories burned for the selected day.
* **Custom Exercise Library:** Add or delete custom exercises. Cloud users get their own isolated, private exercise lists.
* **Interactive Calendar:** View a calendar overview of your past workouts and filter your history by specific dates.
* **Bilingual Support (i18n):** Fully translated into English and Dutch, with user preferences saved to their cloud profile.
* **Secure Authentication:** Full Firebase Auth integration including Login, Registration, and Password Recovery.
* **Data Privacy:** A dedicated "Danger Zone" in settings allows users to permanently and securely delete their account and all associated cloud data.

## 📸 Screenshots

*(Add screenshots of your app here!)*
## 🛠 Tech Stack

* **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (using Expo Router)
* **Backend/Database:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
* **Local Storage:** `@react-native-async-storage/async-storage`
* **UI Components:** `react-native-calendars`, `@expo/vector-icons` (Ionicons)

## 🚀 Getting Started
To get a local copy up and running, follow these simple steps.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed, along with the Expo CLI.

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone [https://github.com/your-username/gains-tracker.git](https://github.com/your-username/gains-tracker.git)
cd gains-tracker
npm install
``` 

### 2. Firebase Configuration
Because this app uses Firebase for cloud syncing, you need to provide your own Firebase configuration keys.
Create a `.env` file in the root directory of the project and add your Firebase credentials using the `EXPO_PUBLIC_` prefix:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Running the App
Start the Expo development server:

```bash
npx expo start
```
You can then open the app on your physical device using the Expo Go app, or run it on an iOS Simulator / Android Emulator.

## 📁 Project Structure
* `app/(tabs)/index.tsx`: The main application hub (Auth screens, Main Dashboard, Modals, Firebase logic).
* `firebaseConfig.ts`: Initializes the Firebase app using local environment variables.
* `assets/`: Contains images, fonts, and icons.

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.