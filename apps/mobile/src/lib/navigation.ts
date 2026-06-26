import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;
type Nav = { canGoBack: () => boolean };

export function navigateBack(
  router: Router,
  navigation: Nav,
  returnTo: string | undefined,
  defaultFallback: Parameters<Router["replace"]>[0]
): void {
  if (navigation.canGoBack()) {
    router.back();
  } else if (returnTo) {
    router.replace(returnTo as Parameters<Router["replace"]>[0]);
  } else {
    router.replace(defaultFallback);
  }
}
