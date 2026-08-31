package com.interviewplatform.interview.room;

import com.interviewplatform.interview.interview.InterviewResponse;
import com.interviewplatform.interview.interview.InterviewSegmentResponse;
import com.interviewplatform.interview.note.NoteResponse;

import java.util.List;

public record RoomBootstrapResponse(
    InterviewResponse interview,
    List<InterviewSegmentResponse> segments,
    InterviewSegmentResponse currentSegment,
    List<NoteResponse> notes) {
}
