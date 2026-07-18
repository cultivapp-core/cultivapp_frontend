export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIPad =
    /iPad/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  const isTablet =
    isIPad ||
    /Tablet|PlayBook|Silk/i.test(userAgent) ||
    (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent));

  const isMobile =
    !isTablet &&
    /Android|iPhone|iPod|Windows Phone|Mobile/i.test(userAgent);

  return {
    device_type: isTablet
      ? "TABLET"
      : isMobile
      ? "MOBILE"
      : "DESKTOP",

    user_agent: userAgent,
  };
};