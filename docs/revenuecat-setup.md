# RevenueCat Setup For Closana

This app is wired to RevenueCat through:

- `react-native-purchases`
- `react-native-purchases-ui`

The React Native app side is implemented in:

- [providers/RevenueCatProvider.tsx](/Users/dariustweh/Documents/Code/closetmind/providers/RevenueCatProvider.tsx)
- [screens/SubscriptionScreen.tsx](/Users/dariustweh/Documents/Code/closetmind/screens/SubscriptionScreen.tsx)
- [screens/SettingsScreen.tsx](/Users/dariustweh/Documents/Code/closetmind/screens/SettingsScreen.tsx)
- [lib/revenuecatConfig.ts](/Users/dariustweh/Documents/Code/closetmind/lib/revenuecatConfig.ts)

## 1. Install the SDK

This repo already has:

```bash
npm install --save react-native-purchases react-native-purchases-ui
```

RevenueCat’s official docs:

- React Native install: https://www.revenuecat.com/docs/getting-started/installation/reactnative#installation
- Configure SDK: https://www.revenuecat.com/docs/getting-started/configuring-sdk
- Paywalls: https://www.revenuecat.com/docs/tools/paywalls
- Customer Center: https://www.revenuecat.com/docs/tools/customer-center

## 2. API key configuration

The app reads these variables:

```env
EXPO_PUBLIC_REVENUECAT_API_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
```

For Closana iOS subscriptions, the required variable is:

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<real RevenueCat iOS public SDK key>
```

Behavior:

- iOS now requires `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- the app no longer silently falls back to the shared key or baked-in `test_...` key for normal iOS subscription flows
- if the key is missing or still starts with `test_`, the provider enters a clear configuration-error state instead of pretending RevenueCat is healthy

After changing the SDK key, rebuild the app. Reloading JavaScript alone is not enough.

## 3. Entitlement setup

Create this entitlement in RevenueCat:

- Entitlement identifier: `closana Pro`

The app checks this entitlement everywhere through:

```ts
customerInfo.entitlements.active['closana Pro']
```

## 4. Offering setup

For the current Closana paywall, only one plan is surfaced in the app:

- Monthly

Create a default offering in RevenueCat and attach the monthly package. The app resolves it by:

- package identifier: `monthly`
- RevenueCat slot: `offering.monthly`
- or product identifier: `com.dariustweh.closana.premium.monthly`

## 5. Product configuration

Configure the iOS product in App Store Connect, then attach it to the default RevenueCat offering.

Current product:

- Monthly product ID: `com.dariustweh.closana.premium.monthly`

The app does not hardcode the displayed price. It pulls the price dynamically from the RevenueCat package metadata at runtime.

## 6. How the app works

### Startup and auth sync

`RevenueCatProvider` does this:

- configures Purchases once at app startup
- validates the iOS SDK key before configuring Purchases
- enables informational entitlement verification
- syncs RevenueCat login state with Supabase auth state
- loads offerings and customer info
- listens for customer info updates
- exposes configuration/native availability state to the rest of the app

### Entitlement checking

Use the hook:

```ts
import { useRevenueCat } from '../providers/RevenueCatProvider';

const { isPro, hasEntitlement } = useRevenueCat();

if (hasEntitlement('closana Pro')) {
  // allow premium feature
}
```

### Purchase flow

The app supports:

- direct package purchases with `purchaseNamedPackage('monthly')`
- RevenueCat paywall presentation with `presentPaywall()`
- paywall gating with `presentPaywallIfNeeded()`
- restore with `restorePurchases()`
- management with `presentCustomerCenter()`

## 7. Where to use it in the app

### Settings

The Settings screen now supports:

- current plan display
- open subscription hub
- restore purchases
- open Customer Center

### Subscription screen

The subscription screen now acts as Closana's custom branded paywall. It supports:

- loading the current RevenueCat offering
- resolving the monthly package dynamically
- showing the monthly price string from RevenueCat
- starting the monthly purchase flow
- restore purchases
- open Customer Center
- graceful fallback when offering data is missing

## 8. Paywall support

The app now uses two paywall paths:

- RevenueCatUI for fast entitlement-gated presentation
- a custom Closana-branded `SubscriptionScreen` as the app-owned paywall surface

Use the reusable hook when protecting premium features:

```ts
import { useRequirePro } from '../hooks/useRequirePro';

const { requirePro } = useRequirePro();

async function onPremiumAction() {
  const granted = await requirePro();
  if (!granted) return;

  // continue into the premium feature
}
```

Behavior:

- returns `true` immediately if `closana Pro` is already active
- otherwise tries `RevenueCatUI.presentPaywallIfNeeded()`
- refreshes customer info after dismissal
- falls back to the custom `Subscription` screen if RevenueCatUI cannot be shown

## 9. Customer Center support

Customer Center is integrated in Settings and the subscription screen through:

```ts
await RevenueCatUI.presentCustomerCenter();
```

Use this for:

- managing subscriptions
- reviewing billing state
- accessing RevenueCat’s management flows

## 10. Testing notes

Important:

- Expo Go only runs RevenueCat in preview mode.
- Real purchases require a development build or production build.
- If you see `Native module not available` or `[RevenueCat] isConfigured() returning false`, your current binary was launched without the RevenueCat native pods linked into it.
- If you see `Invalid API Key` or `RevenueCat SDK Configuration is not valid`, the app is using the wrong iOS public SDK key for the RevenueCat project.

Recommended steps:

1. Build a development client
2. Launch the app in the development build
3. Sign in with a test user
4. Open Settings → Subscription Hub
5. Verify:
   - offerings load
   - the monthly package resolves
   - the custom paywall shows the RevenueCat monthly price
   - purchase works
   - restore works
   - entitlement flips to active
   - Customer Center opens
   - there are no `401 Invalid API Key` errors in the RevenueCat logs

## 11. Native follow-up after install

Because this is an Expo app with native modules, run one of:

```bash
npx expo run:ios
npx expo run:android
```

or regenerate native projects as part of your normal EAS/dev-build flow before testing purchases.

If you already installed `react-native-purchases` after creating the iOS project, rerun:

```bash
cd ios && pod install
```

then rebuild the app. Installing the npm package alone is not enough for an existing dev build.
