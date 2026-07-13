package com.demo.tactical;

import com.demo.tactical.config.TacticalConfig;
import com.demo.tactical.model.AnalysisResult;
import com.demo.tactical.model.Detection;
import com.demo.tactical.model.ImageInfo;
import com.demo.tactical.model.SummaryStats;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.MultipartForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TacticalResource {
    private static final Logger LOG = Logger.getLogger(TacticalResource.class);
    private static final int MAX_CACHE_SIZE = 10; // Only cache last 10 analyses

    @Inject
    StorageService storageService;

    @Inject
    InferenceService inferenceService;

    @Inject
    TacticalConfig config;

    // In-memory cache of analysis results with LRU eviction
    private final Map<String, AnalysisResult> analysisCache = Collections.synchronizedMap(
        new LinkedHashMap<String, AnalysisResult>(MAX_CACHE_SIZE + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, AnalysisResult> eldest) {
                boolean shouldRemove = size() > MAX_CACHE_SIZE;
                if (shouldRemove) {
                    LOG.info("Evicting cached analysis for: " + eldest.getKey());
                }
                return shouldRemove;
            }
        }
    );

    @GET
    @Path("/images")
    public Response listImages() {
        try {
            List<ImageInfo> images = storageService.listImages();

            // Mark images as analyzed if we have cached results
            images.forEach(img -> img.analyzed = analysisCache.containsKey(img.key));

            LOG.info("Returning " + images.size() + " images");
            return Response.ok(images).build();
        } catch (Exception e) {
            LOG.error("Failed to list images", e);
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/analyze")
    public Response analyzeImage(@QueryParam("imageKey") String imageKey) {
        if (imageKey == null || imageKey.isEmpty()) {
            return Response.status(400).entity(Map.of("error", "imageKey parameter required")).build();
        }

        try {
            LOG.info("Analyzing image: " + imageKey);

            // Check cache first
            if (analysisCache.containsKey(imageKey)) {
                LOG.info("Returning cached result for: " + imageKey);
                return Response.ok(analysisCache.get(imageKey)).build();
            }

            // Run inference
            AnalysisResult result = inferenceService.analyzeImage(imageKey);

            // Cache the result
            analysisCache.put(imageKey, result);

            return Response.ok(result).build();
        } catch (Exception e) {
            LOG.error("Failed to analyze image: " + imageKey, e);
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response uploadImage(@FormParam("file") FileUpload file, @FormParam("filename") String filename) throws IOException {
        if (file == null) {
            return Response.status(400).entity(Map.of("error", "No file data provided")).build();
        }

        if (filename == null || filename.isEmpty()) {
            filename = file.fileName() != null ? file.fileName() : "upload-" + System.currentTimeMillis() + ".png";
        }

        try {
            byte[] fileData = Files.readAllBytes(file.filePath());
            String objectKey = config.minio().imagesPrefix() + filename;
            storageService.uploadImage(objectKey, fileData, "image/png");

            LOG.info("Uploaded image: " + objectKey + " (" + fileData.length + " bytes)");
            return Response.ok(Map.of(
                    "success", true,
                    "imageKey", objectKey,
                    "filename", filename
            )).build();
        } catch (Exception e) {
            LOG.error("Failed to upload image", e);
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/detections/{imageId}")
    public Response getDetections(@PathParam("imageId") String imageId) {
        AnalysisResult result = analysisCache.get(imageId);

        if (result == null) {
            return Response.status(404).entity(Map.of("error", "No analysis found for image")).build();
        }

        return Response.ok(result).build();
    }

    @GET
    @Path("/summary")
    public Response getSummary() {
        try {
            int totalImages = analysisCache.size();
            int totalDetections = 0;
            float totalConfidence = 0;
            Map<String, Integer> classCounts = new HashMap<>();

            for (AnalysisResult result : analysisCache.values()) {
                for (Detection detection : result.detections) {
                    totalDetections++;
                    totalConfidence += detection.confidence;
                    classCounts.merge(detection.className, 1, Integer::sum);
                }
            }

            float avgConfidence = totalDetections > 0 ? totalConfidence / totalDetections : 0;

            SummaryStats stats = new SummaryStats(
                    totalImages,
                    totalDetections,
                    classCounts,
                    avgConfidence
            );

            return Response.ok(stats).build();
        } catch (Exception e) {
            LOG.error("Failed to generate summary", e);
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/images/{imageKey}/raw")
    @Produces("image/png")
    public Response getRawImage(@PathParam("imageKey") String imageKey) {
        try {
            // Decode the imageKey (it will be URL encoded)
            String decodedKey = java.net.URLDecoder.decode(imageKey, "UTF-8");

            LOG.info("Fetching raw image: " + decodedKey);
            java.io.InputStream imageStream = storageService.getImage(decodedKey);

            return Response.ok(imageStream).build();
        } catch (Exception e) {
            LOG.error("Failed to fetch raw image: " + imageKey, e);
            return Response.status(404).entity(Map.of("error", "Image not found")).build();
        }
    }

    @GET
    @Path("/health")
    public Response health() {
        return Response.ok(Map.of(
                "status", "UP",
                "timestamp", System.currentTimeMillis(),
                "modelUrl", config.model().url(),
                "cachedResults", analysisCache.size()
        )).build();
    }
}
