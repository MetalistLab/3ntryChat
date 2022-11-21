package com.metaim.android.lib.bridge;

import android.app.Activity;
import android.content.Context;
import android.os.Looper;
import android.os.Message;
import android.util.AttributeSet;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class JsWebView extends WebView {
    static final int EXEC_SCRIPT = 1;
    static final int LOAD_URL = 2;
    static final int LOAD_URL_WITH_HEADERS = 3;
    static final int HANDLE_MESSAGE = 4;

    com.metaim.android.lib.bridge.JsHandler mainThreadHandler = null;
    List<WVJBMessage> startupMessageQueue = null;

    boolean alertBoxBlock = true;

    private Map<String, WVJBResponseCallback<?>> responseCallbackMap = null;
    private Map<String, WVJBHandler<?, ?>> messageHandlerMap = null;
    private long uniqueId = 0;
    private com.metaim.android.lib.bridge.JavascriptCloseWindowListener javascriptCloseWindowListener = null;

    public JsWebView(Context context) {
        this(context, null);
    }

    public JsWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public void disableJavascriptAlertBoxSafetyTimeout(boolean disable) {
        alertBoxBlock = !disable;
    }

    /**
     * send the onResult message to javascript
     */
    public <T> void callHandler(String handlerName, Object data, WVJBResponseCallback<T> responseCallback) {
        if (data == null && (handlerName == null || handlerName.length() == 0)) {
            return;
        }
        WVJBMessage message = new WVJBMessage();
        if (data != null) {
            message.requestParams = data;
        }
        if (responseCallback != null) {
            String callbackId = "java_cb_" + (++uniqueId);
            responseCallbackMap.put(callbackId, responseCallback);
            message.callbackId = callbackId;
        }
        if (handlerName != null) {
            message.handlerName = handlerName;
        }
        queueMessage(message);
    }

    /**
     * Test whether the handler exist in javascript
     */
    public void hasJavascriptMethod(String handlerName, final WVJBMethodExistCallback callback) {
        callHandler("_hasJavascriptMethod", handlerName, new WVJBResponseCallback() {
            @Override
            public void onResult(Object data) {
                callback.onResult((boolean) data);
            }
        });
    }

    /**
     * set a listener for javascript closing the current activity.
     */
    public void setJavascriptCloseWindowListener(JavascriptCloseWindowListener listener) {
        javascriptCloseWindowListener = listener;
    }

    public <T, R> void registerHandler(String handlerName, WVJBHandler<T, R> handler) {
        if (handlerName == null || handlerName.length() == 0 || handler == null) {
            return;
        }
        messageHandlerMap.put(handlerName, handler);
    }

    private synchronized void queueMessage(WVJBMessage message) {
        if (startupMessageQueue != null) {
            startupMessageQueue.add(message);
        } else {
            dispatchMessage(message);
        }
    }

    void dispatchMessage(WVJBMessage message) {
        String messageJSON = msgToJsonObject(message).toString();
        evaluateJavascript(String.format("WebViewJavascriptBridge._handleMessageFromJava(%s)", messageJSON));
    }

    /**
     * handle the onResult message from javascript
     */
    void handleMessage(String info) {
        try {
            JSONObject jo = new JSONObject(info);
            WVJBMessage message = JSONObject2WVJBMessage(jo);
            if (message.responseId != null) {
                WVJBResponseCallback responseCallback = responseCallbackMap.remove(message.responseId);
                if (responseCallback != null) {
                    responseCallback.onResult(message.responseData);
                }
            } else {
                WVJBResponseCallback responseCallback = null;
                if (message.callbackId != null) {
                    final String callbackId = message.callbackId;
                    responseCallback = new WVJBResponseCallback() {
                        @Override
                        public void onResult(Object data) {
                            WVJBMessage msg = new WVJBMessage();
                            msg.responseId = callbackId;
                            msg.responseData = data;
                            dispatchMessage(msg);
                        }
                    };
                }

                WVJBHandler handler;
                handler = messageHandlerMap.get(message.handlerName);
                if (handler != null) {
                    handler.handler(message.requestParams, responseCallback);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private JSONObject msgToJsonObject(WVJBMessage message) {
        JSONObject jo = new JSONObject();
        try {
            if (message.callbackId != null) {
                jo.put("callbackId", message.callbackId);
            }
            if (message.requestParams != null) {
                jo.put("data", message.requestParams);
            }
            if (message.handlerName != null) {
                jo.put("handlerName", message.handlerName);
            }
            if (message.responseId != null) {
                jo.put("responseId", message.responseId);
            }
            if (message.responseData != null) {
                jo.put("responseData", message.responseData);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return jo;
    }

    private WVJBMessage JSONObject2WVJBMessage(JSONObject jo) {
        WVJBMessage message = new WVJBMessage();
        try {
            if (jo.has("callbackId")) {
                message.callbackId = jo.getString("callbackId");
            }
            if (jo.has("data")) {
                message.requestParams = jo.get("data");
            }
            if (jo.has("handlerName")) {
                message.handlerName = jo.getString("handlerName");
            }
            if (jo.has("responseId")) {
                message.responseId = jo.getString("responseId");
            }
            if (jo.has("responseData")) {
                message.responseData = jo.get("responseData");
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return message;
    }

    void init() {
        mainThreadHandler = new com.metaim.android.lib.bridge.JsHandler(this);
        this.responseCallbackMap = new HashMap<>();
        this.messageHandlerMap = new HashMap<>();
        this.startupMessageQueue = new ArrayList<>();
        WebSettings settings = getSettings();
        settings.setDomStorageEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(this, true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setJavaScriptEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        setWebViewClient(new JsWebViewClient());
        setWebChromeClient(new JsWebChromeClient());

        registerHandler("_hasNativeMethod", new WVJBHandler() {
            @Override
            public void handler(Object data, WVJBResponseCallback callback) {
                callback.onResult(messageHandlerMap.get(data) != null);
            }
        });
        registerHandler("_closePage", new WVJBHandler() {
            @Override
            public void handler(Object data, WVJBResponseCallback callback) {
                if (javascriptCloseWindowListener == null || javascriptCloseWindowListener.onClose()) {
                    ((Activity) getContext()).onBackPressed();
                }
            }
        });
        registerHandler("_disableJavascriptAlertBoxSafetyTimeout", new WVJBHandler() {
            @Override
            public void handler(Object data, WVJBResponseCallback callback) {
                disableJavascriptAlertBoxSafetyTimeout((boolean) data);
            }
        });
        super.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void notice(String info) {
                Message msg = mainThreadHandler.obtainMessage(HANDLE_MESSAGE, info);
                mainThreadHandler.sendMessage(msg);
            }

        }, "WVJBInterface");
    }

    void _evaluateJavascript(String script) {
        JsWebView.super.evaluateJavascript(script, null);
    }

    /**
     * This method can be called in any thread, and if it is not called in the main thread,
     * it will be automatically distributed to the main thread.
     */
    public void evaluateJavascript(final String script) {
        if (Looper.getMainLooper() == Looper.myLooper()) {
            _evaluateJavascript(script);
        } else {
            Message msg = mainThreadHandler.obtainMessage(EXEC_SCRIPT, script);
            mainThreadHandler.sendMessage(msg);
        }
    }

    /**
     * This method can be called in any thread, and if it is not called in the main thread, it will be automatically distributed to the main thread.
     */
    public void loadUrlByHandler(String url) {
        Message msg = mainThreadHandler.obtainMessage(LOAD_URL, url);
        mainThreadHandler.sendMessage(msg);
    }

    /**
     * This method can be called in any thread, and if it is not called in the main thread, it will be automatically distributed to the main thread.
     */
    public void loadUrlByHandler(String url, Map<String, String> additionalHttpHeaders) {
        Message msg = mainThreadHandler.obtainMessage(LOAD_URL_WITH_HEADERS, new RequestInfo(url, additionalHttpHeaders));
        mainThreadHandler.sendMessage(msg);
    }
}