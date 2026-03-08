# Gains Tracker (Gym Reps App) 🏋️‍♂️

A sleek, cross-platform mobile application built with **Expo** and **React Native** designed to help users log workouts, track progression, and calculate estimated calorie burn.

## 🚀 Features

* **Dual Language Support**: Seamlessly toggle between English and Dutch (Nederlands).
* **Workout Logging**: Track exercises by sets, reps, and either weight (lbs/kg) or duration (seconds).
* **Automatic Calorie Estimation**: Built-in logic to estimate calories burned based on workout intensity and volume.
* **Exercise Management**: Choose from a default list or add/delete your own custom exercises.
* **Calendar Overview**: Visual history of your workouts with a filtered view to see specific data for any given day.
* **Authentication Flow**: Supports both an offline mode and a cloud-synced mode (Firebase ready).
* **Local Persistence**: Uses `AsyncStorage` to ensure your data stays on your device even after closing the app.

## 🛠 Tech Stack

* **Framework**: [Expo](https://expo.dev/) (SDK 54)
* **UI Library**: [React Native](https://reactnative.dev/) (v0.81.5)
* **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
* **Icons**: `@expo/vector-icons` (Ionicons)
* **Animations**: `react-native-reanimated`
* **Storage**: `@react-native-async-storage/async-storage`
* **Backend**: Firebase (Integration-ready)

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd gym-reps-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npx expo start
    ```

## 📱 Project Structure

* `app/(tabs)/index.tsx`: The main dashboard containing the workout logger, history list, and authentication logic.
* `app/(tabs)/explore.tsx`: A secondary screen showcasing app features and Expo documentation.
* `app.json`: Configuration file for the Expo project, including app icons and splash screens.
* `package.json`: Contains project dependencies and scripts.

## 🔧 Scripts

* `npm run start`: Starts the Expo development server.
* `npm run android`: Opens the app in an Android Emulator.
* `npm run ios`: Opens the app in an iOS Simulator.
* `npm run web`: Opens the app in a web browser.
* `npm run lint`: Runs ESLint to check for code quality issues.
* `npm run reset-project`: Clears the starter code and moves it to `app-example`.

## 📄 License

This project is private. See `package.json` for more details.