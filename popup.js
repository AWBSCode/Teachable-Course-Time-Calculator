function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.getElementById('content').appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const exportBtn = document.getElementById('exportBtn');
    const statsDiv = document.getElementById('stats');
    const courseDetailsDiv = document.getElementById('courseDetails');
    
    let courseData = null;
    
    analyzeBtn.addEventListener('click', analyzeCourse);
    exportBtn.addEventListener('click', exportCourseData);
    
    async function analyzeCourse() {
        try {
            analyzeBtn.textContent = '🔄 Analyzing...';
            analyzeBtn.disabled = true;
            
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Execute the content script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: extractCourseData
            });
            
            courseData = results[0].result;
            
            if (courseData.error) {
                showError(courseData.error);
                return;
            }
            
            displayResults(courseData);
            
        } catch (error) {
            showError('Failed to analyze course: ' + error.message);
        } finally {
            analyzeBtn.textContent = '🔍 Analyze Course';
            analyzeBtn.disabled = false;
        }
    }
    
    function displayResults(data) {
        // Calculate completed and remaining time
        let completedTime = 0;
        let completedLessons = 0;
        
        data.sections.forEach(section => {
            section.lessons.forEach(lesson => {
                if (lesson.isComplete) {
                    completedLessons++;
                    completedTime += lesson.duration;
                }
            });
        });
        
        const remainingTime = data.totalTimeMinutes - completedTime;
        const progressPercent = data.totalTimeMinutes > 0 ? 
            Math.round((completedTime / data.totalTimeMinutes) * 100) : 0;
        
        // Update stats
        document.getElementById('sectionCount').textContent = data.sections.length;
        document.getElementById('lessonCount').textContent = data.totalLessons;
        document.getElementById('completedLessonCount').textContent = completedLessons;
        document.getElementById('timedLessonCount').textContent = data.timedLessons;
        document.getElementById('totalTime').textContent = formatTime(Math.round(data.totalTimeMinutes));
        document.getElementById('completedTime').textContent = formatTime(Math.round(completedTime));
        document.getElementById('remainingTime').textContent = formatTime(Math.round(remainingTime));
        document.getElementById('progressPercent').textContent = `${progressPercent}%`;
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${progressPercent}%`;
        
        // Show stats card
        statsDiv.style.display = 'block';
        
        // Display course details with expandable sections
        let detailsHTML = '';
        data.sections.forEach((section, sectionIndex) => {
            const sectionCompletedLessons = section.lessons.filter(lesson => lesson.isComplete).length;
            const timedLessons = section.lessons.filter(lesson => lesson.duration > 0).length;
            const sectionCompletedTime = section.lessons
                .filter(lesson => lesson.isComplete)
                .reduce((sum, lesson) => sum + lesson.duration, 0);
            const sectionRemainingTime = section.actualTime - sectionCompletedTime;
            const sectionProgress = section.actualTime > 0 ? 
                Math.round((sectionCompletedTime / section.actualTime) * 100) : 0;
            
            const progressText = sectionCompletedLessons > 0 ? ` • ${sectionCompletedLessons}/${section.lessons.length} completed` : '';
            const timeText = section.actualTime > 0 ? formatTime(Math.round(section.actualTime)) : 'No timing info';
            const completedTimeText = sectionCompletedTime > 0 ? ` • ✅ ${formatTime(Math.round(sectionCompletedTime))}` : '';
            const remainingTimeText = sectionRemainingTime > 0 ? ` • ⏳ ${formatTime(Math.round(sectionRemainingTime))}` : '';
            
            detailsHTML += `
                <div class="section-item" data-section-index="${sectionIndex}">
                    <div class="section-header">
                        <div class="section-info">
                            <div class="section-title">${section.title}</div>
                            <div class="lesson-count">${section.lessons.length} lessons (${timedLessons} timed) • ${timeText}${progressText}</div>
                            ${sectionCompletedTime > 0 || sectionRemainingTime > 0 ? 
                                `<div class="section-progress">${sectionProgress}% complete${completedTimeText}${remainingTimeText}</div>` : 
                                ''}
                        </div>
                        <div class="section-controls">
                            <button class="section-btn" onclick="copySectionData(${sectionIndex})" title="Copy section with details">📋 Data</button>
                            <button class="section-btn" onclick="copySectionTitles(${sectionIndex})" title="Copy lesson titles only">📝 Titles</button>
                            <div class="expand-icon">▶</div>
                        </div>
                    </div>
                    <div class="lessons-list" id="lessons-${sectionIndex}">
                        ${section.lessons.map(lesson => `
                            <div class="lesson-item">
                                <div class="lesson-status ${lesson.isComplete ? 'completed' : 'incomplete'}"></div>
                                <div class="lesson-title">${lesson.title}${lesson.duration > 0 ? ` <span style="opacity: 0.7; font-size: 10px;">(${formatTime(Math.round(lesson.duration))})</span>` : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        courseDetailsDiv.innerHTML = detailsHTML;
        courseDetailsDiv.style.display = 'block';
        
        // Add click handlers for section expansion
        addSectionClickHandlers();
        
        // Make copy functions available globally
        window.copySectionData = copySectionData;
        window.copySectionTitles = copySectionTitles;
        
        exportBtn.style.display = 'block';
        
        const timingInfo = data.timedLessons < data.totalLessons ? 
            ` (${data.totalLessons - data.timedLessons} lessons without timing)` : '';
        const progressInfo = completedLessons > 0 ? 
            ` • ${completedLessons} completed (${progressPercent}%)` : '';
        showSuccess(`Found ${data.sections.length} sections with ${data.totalLessons} lessons${timingInfo}${progressInfo}!`);
    }
    
    function addSectionClickHandlers() {
        const sectionItems = document.querySelectorAll('.section-item');
        
        sectionItems.forEach(sectionItem => {
            const header = sectionItem.querySelector('.section-header');
            const sectionIndex = sectionItem.getAttribute('data-section-index');
            const lessonsList = document.getElementById(`lessons-${sectionIndex}`);
            const expandIcon = sectionItem.querySelector('.expand-icon');
            
            header.addEventListener('click', (e) => {
                // Don't expand if clicking on buttons
                if (e.target.classList.contains('section-btn')) {
                    return;
                }
                
                e.preventDefault();
                
                // Toggle the lessons list
                const isExpanded = lessonsList.classList.contains('expanded');
                
                if (isExpanded) {
                    lessonsList.classList.remove('expanded');
                    expandIcon.classList.remove('expanded');
                    lessonsList.style.display = 'none';
                } else {
                    lessonsList.classList.add('expanded');
                    expandIcon.classList.add('expanded');
                    lessonsList.style.display = 'block';
                }
            });
        });
    }
    
    function exportCourseData() {
        if (!courseData) return;
        
        // Calculate completed and remaining time for export
        let completedTime = 0;
        let completedLessons = 0;
        
        courseData.sections.forEach(section => {
            section.lessons.forEach(lesson => {
                if (lesson.isComplete) {
                    completedLessons++;
                    completedTime += lesson.duration;
                }
            });
        });
        
        const remainingTime = courseData.totalTimeMinutes - completedTime;
        const progressPercent = courseData.totalTimeMinutes > 0 ? 
            Math.round((completedTime / courseData.totalTimeMinutes) * 100) : 0;
        
        let exportText = `Course Analysis Report\n`;
        exportText += `========================\n\n`;
        exportText += `Total Sections: ${courseData.sections.length}\n`;
        exportText += `Total Lessons: ${courseData.totalLessons}\n`;
        exportText += `Completed Lessons: ${completedLessons}\n`;
        exportText += `Timed Lessons: ${courseData.timedLessons}\n`;
        exportText += `Total Time: ${formatTime(Math.round(courseData.totalTimeMinutes))}\n`;
        exportText += `Completed Time: ${formatTime(Math.round(completedTime))}\n`;
        exportText += `Remaining Time: ${formatTime(Math.round(remainingTime))}\n`;
        exportText += `Progress: ${progressPercent}%\n`;
        exportText += `Lessons Without Timing: ${courseData.totalLessons - courseData.timedLessons}\n\n`;
        
        exportText += `Section Details:\n`;
        exportText += `----------------\n`;
        
        courseData.sections.forEach((section, index) => {
            const sectionCompletedCount = section.lessons.filter(lesson => lesson.isComplete).length;
            const sectionCompletedTime = section.lessons
                .filter(lesson => lesson.isComplete)
                .reduce((sum, lesson) => sum + lesson.duration, 0);
            const sectionRemainingTime = section.actualTime - sectionCompletedTime;
            const sectionProgress = section.actualTime > 0 ? 
                Math.round((sectionCompletedTime / section.actualTime) * 100) : 0;
            const timedCount = section.lessons.filter(lesson => lesson.duration > 0).length;
            const progressInfo = sectionCompletedCount > 0 ? ` (${sectionCompletedCount}/${section.lessons.length} completed - ${sectionProgress}%)` : '';
            
            exportText += `\n${index + 1}. ${section.title}${progressInfo}\n`;
            exportText += `   Total Lessons: ${section.lessons.length} (${timedCount} timed)\n`;
            exportText += `   Total Time: ${section.actualTime > 0 ? formatTime(section.actualTime.toFixed(2)) : 'No timing info'}\n`;
            if (sectionCompletedTime > 0) {
                exportText += `   Completed Time: ${formatTime(sectionCompletedTime.toFixed(2))}\n`;
            }
            if (sectionRemainingTime > 0) {
                exportText += `   Remaining Time: ${formatTime(sectionRemainingTime.toFixed(2))}\n`;
            }
            exportText += `   Lessons:\n`;
            section.lessons.forEach((lesson, lessonIndex) => {
                const status = lesson.isComplete ? '✅' : '⏳';
                const timeInfo = lesson.duration > 0 ? ` (${formatTime(lesson.duration.toFixed(2))})` : '';
                exportText += `   ${status} ${lessonIndex + 1}. ${lesson.title}${timeInfo}\n`;
            });
            exportText += `\n`;
        });
        
        // Copy to clipboard
        navigator.clipboard.writeText(exportText).then(() => {
            exportBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                exportBtn.textContent = '📋 Copy Course Data';
            }, 2000);
        }).catch(() => {
            showError('Failed to copy to clipboard');
        });
    }
    
    function formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.getElementById('content').appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    function copySectionData(sectionIndex) {
        if (!courseData || !courseData.sections[sectionIndex]) return;
        
        const section = courseData.sections[sectionIndex];
        const completedCount = section.lessons.filter(lesson => lesson.isComplete).length;
        const timedLessons = section.lessons.filter(lesson => lesson.duration > 0).length;
        const completedTime = section.lessons
            .filter(lesson => lesson.isComplete)
            .reduce((sum, lesson) => sum + lesson.duration, 0);
        const remainingTime = section.actualTime - completedTime;
        const progressPercent = section.actualTime > 0 ? 
            Math.round((completedTime / section.actualTime) * 100) : 0;
        
        let sectionText = `Section: ${section.title}\n`;
        sectionText += `==========================================\n`;
        sectionText += `Total Lessons: ${section.lessons.length}\n`;
        sectionText += `Timed Lessons: ${timedLessons}\n`;
        sectionText += `Completed: ${completedCount}/${section.lessons.length}\n`;
        sectionText += `Total Time: ${section.actualTime > 0 ? formatTime(section.actualTime) : 'No timing info'}\n`;
        if (completedTime > 0) {
            sectionText += `Completed Time: ${formatTime(completedTime)}\n`;
        }
        if (remainingTime > 0) {
            sectionText += `Remaining Time: ${formatTime(remainingTime)}\n`;
        }
        sectionText += `Progress: ${progressPercent}%\n\n`;
        
        sectionText += `Lesson Details:\n`;
        sectionText += `---------------\n`;
        section.lessons.forEach((lesson, index) => {
            const status = lesson.isComplete ? '✅' : '⏳';
            const timeInfo = lesson.duration > 0 ? ` (${formatTime(lesson.duration)})` : '';
            sectionText += `${status} ${index + 1}. ${lesson.title}${timeInfo}\n`;
        });
        
        copyToClipboard(sectionText, sectionIndex, 'data');
    }
    
    function copySectionTitles(sectionIndex) {
        if (!courseData || !courseData.sections[sectionIndex]) return;
        
        const section = courseData.sections[sectionIndex];
        
        let titlesText = `${section.title} - Lesson Titles:\n`;
        titlesText += `${'='.repeat(section.title.length + 18)}\n`;
        
        section.lessons.forEach((lesson, index) => {
            const status = lesson.isComplete ? '✅ ' : '';
            titlesText += `${status}${index + 1}. ${lesson.title}\n`;
        });
        
        copyToClipboard(titlesText, sectionIndex, 'titles');
    }
    
    function copyToClipboard(text, sectionIndex, type) {
        navigator.clipboard.writeText(text).then(() => {
            // Find the button that was clicked and show success state
            const buttons = document.querySelectorAll(`[data-section-index="${sectionIndex}"] .section-btn`);
            const targetButton = type === 'data' ? buttons[0] : buttons[1];
            
            if (targetButton) {
                const originalText = targetButton.textContent;
                targetButton.textContent = '✅ Copied!';
                targetButton.classList.add('success');
                
                setTimeout(() => {
                    targetButton.textContent = originalText;
                    targetButton.classList.remove('success');
                }, 2000);
            }
        }).catch(() => {
            showError('Failed to copy to clipboard');
        });
    }
});

// This function will be injected into the page
function extractCourseData() {
    try {
        const sections = [];
        let totalLessons = 0;
        let totalTimeMinutes = 0;
        let timedLessons = 0;
        
        // Find all course sections
        const sectionElements = document.querySelectorAll('.course-section');
        
        if (sectionElements.length === 0) {
            return {
                error: 'No course sections found. Make sure you\'re on a Teachable course page.'
            };
        }
        
        // Helper function to parse time from title format: "TITLE (MM:SS)"
        function parseTimeFromTitle(title) {
            const timeRegex = /\((\d{1,2}):(\d{2})\)$/;
            const match = title.match(timeRegex);
            
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                return minutes + (seconds / 60); // Convert to decimal minutes
            }
            return 0;
        }
        
        // Helper function to clean title by removing time format
        function cleanTitle(title) {
            return title.replace(/\s*\(\d{1,2}:\d{2}\)$/, '').trim();
        }
        
        sectionElements.forEach(sectionElement => {
            const sectionTitleElement = sectionElement.querySelector('.section-title');
            if (!sectionTitleElement) return;
            
            const sectionTitle = sectionTitleElement.textContent.trim();
            const lessons = [];
            let sectionTime = 0;
            
            // Find all lessons in this section
            const lessonElements = sectionElement.querySelectorAll('.section-item');
            
            lessonElements.forEach(lessonElement => {
                const lessonNameElement = lessonElement.querySelector('.lecture-name');
                if (lessonNameElement) {
                    const fullLessonTitle = lessonNameElement.textContent.trim();
                    const isComplete = lessonElement.classList.contains('completed') || 
                                     lessonElement.classList.contains('complete') ||
                                     lessonElement.querySelector('.completed') !== null ||
                                     lessonElement.querySelector('.fa-check') !== null ||
                                     lessonElement.querySelector('[class*="check"]') !== null;
                    
                    // Parse time from title
                    const duration = parseTimeFromTitle(fullLessonTitle);
                    const cleanedTitle = cleanTitle(fullLessonTitle);
                    
                    if (duration > 0) {
                        timedLessons++;
                        sectionTime += duration;
                    }
                    
                    lessons.push({
                        title: cleanedTitle,
                        fullTitle: fullLessonTitle,
                        duration: duration, // in minutes
                        id: lessonElement.getAttribute('data-lecture-id'),
                        url: lessonElement.getAttribute('data-lecture-url'),
                        isComplete: isComplete
                    });
                }
            });
            
            sections.push({
                title: sectionTitle,
                lessons: lessons,
                actualTime: sectionTime, // Actual time based on lesson durations
                estimatedTime: lessons.length * 10 // Keep old estimation for fallback
            });
            
            totalLessons += lessons.length;
            totalTimeMinutes += sectionTime;
        });
        
        return {
            sections: sections,
            totalLessons: totalLessons,
            timedLessons: timedLessons,
            totalTimeMinutes: totalTimeMinutes,
            extractedAt: new Date().toISOString(),
            pageUrl: window.location.href
        };
        
    } catch (error) {
        return {
            error: 'Error extracting course data: ' + error.message
        };
    }
}