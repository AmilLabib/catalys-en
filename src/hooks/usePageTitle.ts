import { useEffect } from "react";
import { usePageTitleContext } from "../context/PageTitleContext";

/**
 * Sets the navbar page title.
 *
 * Call this once inside each page component.
 */
export function usePageTitle(title: string) {
  const { setTitle } = usePageTitleContext();

  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);
}
