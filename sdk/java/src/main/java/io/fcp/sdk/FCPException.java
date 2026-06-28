package io.fcp.sdk;

/** Wraps non-2xx HTTP responses from the FCP API. */
public class FCPException extends RuntimeException {
    private final int statusCode;
    private final String body;

    public FCPException(int statusCode, String body) {
        super("FCP API error %d: %s".formatted(statusCode, body));
        this.statusCode = statusCode;
        this.body = body;
    }

    public int statusCode() { return statusCode; }
    public String body() { return body; }
}
