package com.veritas.prayers;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PrayerApplication {
    private static final String READINGS_SOURCE = "http://catholic-dlc.org.hk/";
    private static final String READINGS_PROXY_BASE = "/api/readings";
    private static final String READINGS_PROXY_PATH = "/api/readings/";
    private static final Pattern HTML_CHARSET = Pattern.compile(
        "(?i)charset\\s*=\\s*[\"']?([A-Za-z0-9._-]+)"
    );
    private static final Pattern HTML_CHARSET_DECLARATION = Pattern.compile(
        "(?i)(charset\\s*=\\s*[\"']?)[A-Za-z0-9._-]+"
    );
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    private static final List<Map<String, String>> PRAYERS = List.of(
        prayer("our-father", "Our Father", "Traditional", "1 min",
            "The prayer Jesus taught his disciples.",
            "Our Father, who art in heaven, hallowed be thy name. Thy kingdom come, thy will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation, but deliver us from evil. Amen.",
            "Pater noster, qui es in caelis: sanctificetur nomen tuum; adveniat regnum tuum; fiat voluntas tua, sicut in caelo et in terra. Panem nostrum quotidianum da nobis hodie; et dimitte nobis debita nostra, sicut et nos dimittimus debitoribus nostris; et ne nos inducas in tentationem; sed libera nos a malo. Amen."),
        prayer("hail-mary", "Hail Mary", "Marian", "1 min",
            "A prayer asking Mary to pray with us and for us.",
            "Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
            "Ave Maria, gratia plena, Dominus tecum. Benedicta tu in mulieribus, et benedictus fructus ventris tui, Iesus. Sancta Maria, Mater Dei, ora pro nobis peccatoribus, nunc et in hora mortis nostrae. Amen."),
        prayer("glory-be", "Glory Be", "Traditional", "1 min",
            "A short doxology of praise to the Holy Trinity.",
            "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.",
            "Gloria Patri, et Filio, et Spiritui Sancto. Sicut erat in principio, et nunc, et semper, et in saecula saeculorum. Amen."),
        prayer("act-of-contrition", "Act of Contrition", "Sacraments", "2 min",
            "A prayer of sorrow and a renewed desire to follow Christ.",
            "My God, I am sorry for my sins with all my heart. In choosing to do wrong and failing to do good, I have sinned against you, whom I should love above all things. I firmly intend, with your help, to do penance, to sin no more, and to avoid whatever leads me to sin. Amen.", null),
        prayer("morning-offering", "Morning Offering", "Daily", "2 min",
            "Begin the day by offering its joys and challenges to God.",
            "God of this new morning, I offer you the thoughts, words, work, and encounters of this day. Bless what is good, guide what is uncertain, and help me meet each person with patience and love. May all I do draw me closer to you. Amen.", null),
        prayer("prayer-for-peace", "Prayer for Peace", "Hope & Peace", "2 min",
            "A moment to pray for peace in our hearts and in the world.",
            "Prince of Peace, quiet what is restless within me. Give courage to those who work for reconciliation, comfort to those living through conflict, and wisdom to those entrusted with difficult choices. Make me a patient listener and a small instrument of your peace. Amen.", null),
        prayer("evening-gratitude", "Evening Gratitude", "Daily", "2 min",
            "End the day by noticing its gifts and placing tomorrow in God's care.",
            "Gracious God, thank you for the gifts and graces of this day, both seen and unseen. Receive the work left unfinished and the worries I carry. Forgive my failures, bless those I love, and grant us peaceful rest beneath your loving care. Amen.", null),
        prayer("prayer-for-the-sick", "Prayer for the Sick", "Hope & Peace", "2 min",
            "Entrust those who are ill to the healing compassion of Christ.",
            "Jesus, companion of the suffering, draw near to all who are sick and those who care for them. Bring relief where there is pain, strength where there is weariness, and hope where the way feels long. Help me serve with tenderness and trust in your mercy. Amen.", null)
    );

    private static final List<Map<String, String>> REFLECTIONS = List.of(
        Map.of("title", "Make room for stillness",
            "text", "Take one unhurried breath. Bring whatever is on your heart to God, and let this quiet moment be enough.",
            "reference", "A moment of prayer for today"),
        Map.of("title", "Begin again with grace",
            "text", "You do not have to carry every worry alone. Place one of them in God's hands and take the next small step in peace.",
            "reference", "A moment of prayer for today"),
        Map.of("title", "Love in the ordinary",
            "text", "Notice one person who might need kindness today. A patient word or a listening ear can become a quiet prayer.",
            "reference", "A moment of prayer for today"),
        Map.of("title", "Trust the quiet work",
            "text", "Not every good thing grows quickly. Ask for patience with yourself and trust that small acts of faithfulness matter.",
            "reference", "A moment of prayer for today")
    );

    private static final List<String> ALLOWED_ORIGINS = List.of(
        System.getenv().getOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
            .split(",")
    );

    private PrayerApplication() {}

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", PrayerApplication::handle);
        server.start();
        System.out.println("Prayer API listening on port " + port);
    }

    private static Map<String, String> prayer(
        String id, String title, String category, String duration,
        String description, String text, String latinText
    ) {
        Map<String, String> prayer = new LinkedHashMap<>();
        prayer.put("id", id);
        prayer.put("title", title);
        prayer.put("category", category);
        prayer.put("duration", duration);
        prayer.put("description", description);
        prayer.put("text", text);
        if (latinText != null) {
            prayer.put("latinText", latinText);
        }
        return Map.copyOf(prayer);
    }

    private static void handle(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }
        if (!"GET".equals(exchange.getRequestMethod())) {
            send(exchange, 405, Map.of("error", "Method not allowed."));
            return;
        }

        String path = exchange.getRequestURI().getPath();
        if ("/health".equals(path)) {
            send(exchange, 200, Map.of("status", "ok"));
        } else if ("/api/prayers".equals(path) || "/api/prayers/".equals(path)) {
            send(exchange, 200, Map.of("prayers", filterPrayers(exchange)));
        } else if ("/api/daily".equals(path) || "/api/daily/".equals(path)) {
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            long ordinal = today.toEpochDay() + 719163;
            send(exchange, 200, Map.of(
                "date", today.toString(),
                "reflection", REFLECTIONS.get((int) (ordinal % REFLECTIONS.size())),
                "prayer", PRAYERS.get((int) (ordinal % PRAYERS.size()))
            ));
        } else if ("/api/readings".equals(path) || path.startsWith(READINGS_PROXY_PATH)) {
            proxyReadings(exchange, path);
        } else {
            send(exchange, 404, Map.of("error", "Not found."));
        }
    }

    private static void proxyReadings(HttpExchange exchange, String path) throws IOException {
        String resource = path.equals("/api/readings") || path.equals(READINGS_PROXY_PATH)
            ? "frame3.htm"
            : path.substring(READINGS_PROXY_PATH.length());
        if (!resource.matches("[A-Za-z0-9._/-]+") || resource.contains("..")) {
            send(exchange, 400, Map.of("error", "Invalid readings resource."));
            return;
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(READINGS_SOURCE + resource))
            .timeout(Duration.ofSeconds(20))
            .header("User-Agent", "Veritas Readings Embed")
            .GET()
            .build();
        try {
            HttpResponse<byte[]> response = HTTP_CLIENT.send(
                request, HttpResponse.BodyHandlers.ofByteArray()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                sendReadingsError(exchange);
                System.err.println("Chinese readings source returned HTTP " + response.statusCode());
                return;
            }

            byte[] body = response.body();
            String contentType = response.headers().firstValue("Content-Type")
                .orElse("application/octet-stream");
            if (contentType.toLowerCase().contains("text/html")) {
                String html = decodeReadingHtml(body, contentType)
                    .replace("http://catholic-dlc.org.hk", READINGS_PROXY_BASE)
                    .replace("https://catholic-dlc.org.hk", READINGS_PROXY_BASE);
                html = HTML_CHARSET_DECLARATION.matcher(html).replaceAll("$1UTF-8");
                body = html.getBytes(StandardCharsets.UTF_8);
                contentType = "text/html; charset=utf-8";
            }
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.getResponseHeaders().set("Cache-Control", "no-store");
            exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            sendReadingsError(exchange);
            System.err.println("Chinese readings request was interrupted.");
        } catch (IOException error) {
            sendReadingsError(exchange);
            System.err.println("Unable to retrieve Chinese readings: " + error.getMessage());
        }
    }

    private static String decodeReadingHtml(byte[] body, String contentType) {
        if (body.length >= 3
            && (body[0] & 0xff) == 0xef
            && (body[1] & 0xff) == 0xbb
            && (body[2] & 0xff) == 0xbf) {
            return new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        }

        String declaredCharset = charsetFrom(contentType);
        if (declaredCharset == null) {
            String header = new String(body, StandardCharsets.ISO_8859_1);
            declaredCharset = charsetFrom(header);
        }
        Charset charset;
        try {
            charset = declaredCharset == null
                ? Charset.forName("Big5")
                : Charset.forName(declaredCharset);
        } catch (IllegalArgumentException error) {
            charset = Charset.forName("Big5");
        }
        return new String(body, charset);
    }

    private static String charsetFrom(String text) {
        Matcher matcher = HTML_CHARSET.matcher(text);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static void sendReadingsError(HttpExchange exchange) throws IOException {
        String html = """
            <!doctype html><html lang="zh-Hant"><meta charset="utf-8">
            <p>今日中文讀經暫時無法載入。</p>
            <a href="http://catholic-dlc.org.hk/frame3.htm">前往香港教區禮儀委員會網站</a>
            </html>
            """;
        byte[] body = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(502, body.length);
        try (var output = exchange.getResponseBody()) {
            output.write(body);
        }
    }

    private static List<Map<String, String>> filterPrayers(HttpExchange exchange) {
        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String category = query.getOrDefault("category", "");
        String term = query.getOrDefault("q", "").toLowerCase();
        List<Map<String, String>> results = new ArrayList<>();
        for (Map<String, String> prayer : PRAYERS) {
            if (!category.isEmpty() && !"All".equals(category)
                && !category.equals(prayer.get("category"))) {
                continue;
            }
            if (!term.isEmpty()
                && !prayer.get("title").toLowerCase().contains(term)
                && !prayer.get("category").toLowerCase().contains(term)
                && !prayer.get("description").toLowerCase().contains(term)
                && !prayer.getOrDefault("latinText", "").toLowerCase().contains(term)) {
                continue;
            }
            results.add(prayer);
        }
        return results;
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> values = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return values;
        }
        for (String pair : rawQuery.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
            String value = parts.length == 2
                ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "";
            values.put(key, value);
        }
        return values;
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && ALLOWED_ORIGINS.stream().anyMatch(item -> item.trim().equals(origin))) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().set("Vary", "Origin");
        }
    }

    private static void send(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] response = toJson(body).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, response.length);
        try (var output = exchange.getResponseBody()) {
            output.write(response);
        }
    }

    private static String toJson(Object value) {
        if (value instanceof String text) {
            return "\"" + escapeJson(text) + "\"";
        }
        if (value instanceof Map<?, ?> map) {
            List<String> fields = new ArrayList<>();
            map.forEach((key, item) -> fields.add(toJson(key.toString()) + ":" + toJson(item)));
            return "{" + String.join(",", fields) + "}";
        }
        if (value instanceof Iterable<?> items) {
            List<String> values = new ArrayList<>();
            items.forEach(item -> values.add(toJson(item)));
            return "[" + String.join(",", values) + "]";
        }
        return value.toString();
    }

    private static String escapeJson(String text) {
        StringBuilder escaped = new StringBuilder();
        for (char character : text.toCharArray()) {
            switch (character) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (character < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) character));
                    } else {
                        escaped.append(character);
                    }
                }
            }
        }
        return escaped.toString();
    }
}
