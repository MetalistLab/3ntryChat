package com.metaim.android.lib.bridge;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;

import java.lang.ref.WeakReference;

class JsHandler extends Handler {
    private final WeakReference<JsWebView> mWebViewRef;

    JsHandler(JsWebView webView) {
        super(Looper.getMainLooper());
        mWebViewRef = new WeakReference<>(webView);
    }

    @Override
    public void handleMessage(Message msg) {
        final JsWebView jsWebView = mWebViewRef.get();
        if (jsWebView == null) {
            return;
        }

        final Context context = jsWebView.getContext();
        if (context == null) {
            return;
        }

        switch (msg.what) {
            case JsWebView.EXEC_SCRIPT:
                jsWebView._evaluateJavascript((String) msg.obj);
                break;
            case JsWebView.LOAD_URL:
                jsWebView.loadUrl((String) msg.obj);
                break;
            case JsWebView.LOAD_URL_WITH_HEADERS:
                RequestInfo info = (RequestInfo) msg.obj;
                jsWebView.loadUrl(info.url, info.headers);
                break;
            case JsWebView.HANDLE_MESSAGE:
                jsWebView.handleMessage((String) msg.obj);
                break;
        }
    }
}