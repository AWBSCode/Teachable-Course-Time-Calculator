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
        // Update stats
        document.getElementById('sectionCount').textContent = data.sections.length;
        document.getElementById('lessonCount').textContent = data.totalLessons;
        document.getElementById('totalTime').textContent = formatTime(data.totalTimeMinutes);
        
        // Show stats card
        statsDiv.style.display = 'block';
        
        // Display course details with expandable sections
        let detailsHTML = '';
        data.sections.forEach((section, sectionIndex) => {
            const completedLessons = section.lessons.filter(lesson => lesson.isComplete).length;
            const progressText = completedLessons > 0 ? ` • ${completedLessons}/${section.lessons.length} completed` : '';
            
            detailsHTML += `
                <div class="section-item" data-section-index="${sectionIndex}">
                    <div class="section-header">
                        <div>
                            <div class="section-title">${section.title}</div>
                            <div class="lesson-count">${section.lessons.length} lessons • ${formatTime(section.estimatedTime)} estimated${progressText}</div>
                        </div>
                        <div class="expand-icon">▶</div>
                    </div>
                    <div class="lessons-list" id="lessons-${sectionIndex}">
                        ${section.lessons.map(lesson => `
                            <div class="lesson-item">
                                <div class="lesson-status ${lesson.isComplete ? 'completed' : 'incomplete'}"></div>
                                <div class="lesson-title">${lesson.title}</div>
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
        
        exportBtn.style.display = 'block';
        
        showSuccess(`Found ${data.sections.length} sections with ${data.totalLessons} lessons!`);
    }
    
    function addSectionClickHandlers() {
        const sectionItems = document.querySelectorAll('.section-item');
        
        sectionItems.forEach(sectionItem => {
            const header = sectionItem.querySelector('.section-header');
            const sectionIndex = sectionItem.getAttribute('data-section-index');
            const lessonsList = document.getElementById(`lessons-${sectionIndex}`);
            const expandIcon = sectionItem.querySelector('.expand-icon');
            
            header.addEventListener('click', (e) => {
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
        
        let exportText = `Course Analysis Report\n`;
        exportText += `========================\n\n`;
        exportText += `Total Sections: ${courseData.sections.length}\n`;
        exportText += `Total Lessons: ${courseData.totalLessons}\n`;
        exportText += `Estimated Total Time: ${formatTime(courseData.totalTimeMinutes)}\n\n`;
        
        exportText += `Section Details:\n`;
        exportText += `----------------\n`;
        
        courseData.sections.forEach((section, index) => {
            const completedCount = section.lessons.filter(lesson => lesson.isComplete).length;
            const progressInfo = completedCount > 0 ? ` (${completedCount}/${section.lessons.length} completed)` : '';
            
            exportText += `\n${index + 1}. ${section.title}${progressInfo}\n`;
            exportText += `   Lessons (${section.lessons.length}):\n`;
            section.lessons.forEach((lesson, lessonIndex) => {
                const status = lesson.isComplete ? '✅' : '⏳';
                exportText += `   ${status} ${lessonIndex + 1}. ${lesson.title}\n`;
            });
            exportText += `   Estimated Time: ${formatTime(section.estimatedTime)}\n`;
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
    
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        document.getElementById('content').appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
});

// This function will be injected into the page
function extractCourseData() {
    try {
        const sections = [];
        let totalLessons = 0;
        let totalTimeMinutes = 0;
        
        // Find all course sections
        const sectionElements = document.querySelectorAll('.course-section');
        
        if (sectionElements.length === 0) {
            return {
                error: 'No course sections found. Make sure you\'re on a Teachable course page.'
            };
        }
        
        sectionElements.forEach(sectionElement => {
            const sectionTitleElement = sectionElement.querySelector('.section-title');
            if (!sectionTitleElement) return;
            
            const sectionTitle = sectionTitleElement.textContent.trim();
            const lessons = [];
            
            // Find all lessons in this section
            const lessonElements = sectionElement.querySelectorAll('.section-item');
            
            lessonElements.forEach(lessonElement => {
                const lessonNameElement = lessonElement.querySelector('.lecture-name');
                if (lessonNameElement) {
                    const lessonTitle = lessonNameElement.textContent.trim();
                    const isComplete = lessonElement.classList.contains('completed') || 
                                     lessonElement.classList.contains('complete') ||
                                     lessonElement.querySelector('.completed') !== null;
                    
                    lessons.push({
                        title: lessonTitle,
                        id: lessonElement.getAttribute('data-lecture-id'),
                        url: lessonElement.getAttribute('data-lecture-url'),
                        isComplete: isComplete
                    });
                }
            });
            
            // Estimate time per lesson (average 10 minutes per lesson)
            const estimatedTime = lessons.length * 10;
            
            sections.push({
                title: sectionTitle,
                lessons: lessons,
                estimatedTime: estimatedTime
            });
            
            totalLessons += lessons.length;
            totalTimeMinutes += estimatedTime;
        });
        
        return {
            sections: sections,
            totalLessons: totalLessons,
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