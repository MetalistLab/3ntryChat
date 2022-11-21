package com.metaim.android.lib.bridge;

import java.util.Map;

class RequestInfo {
    String url;
    Map<String, String> headers;

    RequestInfo(String url, Map<String, String> additionalHttpHeaders) {
        this.url = url;
        this.headers = additionalHttpHeaders;
    }
}