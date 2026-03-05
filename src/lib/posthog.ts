import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_API_HOST as string,
  ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string,
  capture_pageview: false,
  capture_pageleave: true,
});

export { posthog };
