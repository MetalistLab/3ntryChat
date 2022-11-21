package com.metaim.android.lib.bridge;

import android.webkit.WebChromeClient;
import android.webkit.WebView;

public class JsWebChromeClient extends WebChromeClient {
    @Override
    public void onProgressChanged(WebView view, int newProgress) {
        if (newProgress > 80) {
            synchronized (((JsWebView) view)) {
                if (((JsWebView) view).startupMessageQueue != null) {
                    for (int i = 0; i < ((JsWebView) view).startupMessageQueue.size(); i++) {
                        final WVJBMessage message = ((JsWebView) view).startupMessageQueue.get(i);
                        ((JsWebView) view).dispatchMessage(message);
                    }
                    ((JsWebView) view).startupMessageQueue = null;
                }
            }
        }

        super.onProgressChanged(view, newProgress);
    }
}
